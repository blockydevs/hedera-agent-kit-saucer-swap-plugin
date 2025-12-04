import { Context, AccountResolver, IHederaMirrornodeService, contractExecuteTransactionParametersNormalised } from "hedera-agent-kit";
import { getSwapQuoteV2Parameters, getSwapQuoteV2ParametersNormalised, swapV2Parameters } from './saucer-swap.zod'
import { Client } from "@hashgraph/sdk";
import { ethers } from "ethers";
import z from 'zod';
import { getHederaTokenAddress, getHederaTokenEVMAddress, getTokenDecimals, toBaseUnit } from "./utils";
import SwapRouterAbi from './abi/SwapRouter.json' assert { type: 'json' }
import { SaucerSwapV2ConfigService } from "./service/saucer-swap-v2-config-service";
import { buildEncodedPath } from "./utils/swap-path";
import { SAUCER_SWAP_CONFIG } from "./constants";
import { SaucerSwapApiService } from "./service/saucer-swap-rest-pools-service.interface";
import { PoolFinderService } from "./service/pool-finder-service";
import { InvalidAmountError } from "./errors";

export default class SaucerSwapV2ParameterNormaliser {
    static parseParamsWithSchema(
        params: any,
        schema: any,
        context: Context = {},
      ): z.infer<ReturnType<typeof schema>> {
        let parsedParams: z.infer<ReturnType<typeof schema>>;
        try {
          parsedParams = schema(context).parse(params);
        } catch (e) {
          if (e instanceof z.ZodError) {
            const issues = this.formatZodIssues(e);
            throw new Error(`Invalid parameters: ${issues}`);
          }
          throw e;
        }
        return parsedParams;
      }
    
    private static formatZodIssues(error: z.ZodError): string {
        return error.errors.map(err => `Field "${err.path.join('.')}" - ${err.message}`).join('; ');
    }

    static async normaliseGetSwapQuoteV2Params(
        params: z.infer<ReturnType<typeof getSwapQuoteV2Parameters>>,
        context: Context,
        saucerSwapApiService: SaucerSwapApiService,
    ) : Promise<z.infer<ReturnType<typeof getSwapQuoteV2ParametersNormalised>>> {
        const parsedParams: z.infer<ReturnType<typeof getSwapQuoteV2Parameters>> =
        this.parseParamsWithSchema(params, getSwapQuoteV2Parameters, context);
        // Validate amount
        if (parsedParams.amountIn <= 0) {
            throw new InvalidAmountError(parsedParams.amountIn);
        }

        const tokenInEVM = getHederaTokenEVMAddress(parsedParams.tokenIn)
        const inputTokenHedera = getHederaTokenAddress(parsedParams.tokenIn)
        const tokenOutEVM = getHederaTokenEVMAddress(parsedParams.tokenOut)
        const outputTokenHedera = getHederaTokenAddress(parsedParams.tokenOut)
        
        // Use PoolFinderService to find the pool
        const pool = await PoolFinderService.findPoolForTokens(
            inputTokenHedera,
            outputTokenHedera,
            saucerSwapApiService
        );
        const poolFees = pool.fee;
        const poolFeesInHexFormat = `0x${poolFees?.toString(16).padStart(6, '0')}`;
        const decimals = getTokenDecimals(pool, inputTokenHedera);
        const amountIn = toBaseUnit(parsedParams.amountIn, decimals).toNumber();
        return {
            tokenIn: tokenInEVM,
            tokenOut: tokenOutEVM,
            amountIn,
            poolFeesInHexFormat: poolFeesInHexFormat
        };
    }

    static async normaliseSwapV2Params(
        params: z.infer<ReturnType<typeof swapV2Parameters>>,
        context: Context,
        saucerSwapV2ConfigService: SaucerSwapV2ConfigService,
        saucerSwapApiService: SaucerSwapApiService,
        mirrorNode: IHederaMirrornodeService,
        client: Client,
    ) : Promise<z.infer<ReturnType<typeof contractExecuteTransactionParametersNormalised>>> {
        const parsedParams: z.infer<ReturnType<typeof swapV2Parameters>> =
        this.parseParamsWithSchema(params, swapV2Parameters, context);

        // Validate amount is positive
        if (parsedParams.amountIn <= 0) {
            throw new InvalidAmountError(parsedParams.amountIn);
        }
        const inputTokenEVM = getHederaTokenEVMAddress(parsedParams.tokenIn)
        const inputTokenHedera = getHederaTokenAddress(parsedParams.tokenIn)
        const outputTokenEVM = getHederaTokenEVMAddress(parsedParams.tokenOut)
        const outputTokenHedera = getHederaTokenAddress(parsedParams.tokenOut)
        const recipient = AccountResolver.resolveAccount(parsedParams.recipientAddress, context, client);
        const recipientAddress = await AccountResolver.getHederaEVMAddress(recipient, mirrorNode);
        
        // Use PoolFinderService to find the pool
        const pool = await PoolFinderService.findPoolForTokens(
            inputTokenHedera,
            outputTokenHedera,
            saucerSwapApiService
        );
        const poolFees = pool.fee;
        const decimals = getTokenDecimals(pool, inputTokenHedera);
        const amountIn = toBaseUnit(parsedParams.amountIn, decimals).toNumber();
        const poolFeesInHexFormat = `0x${poolFees?.toString(16).padStart(6, '0')}`;
        const routeDataWithFee = buildEncodedPath(inputTokenEVM, poolFeesInHexFormat.toLowerCase(), outputTokenEVM);
        const abiSwapRouterInterface = new ethers.Interface(SwapRouterAbi)
        const swapRouterContractId = saucerSwapV2ConfigService.getSwapRouterContractId()
        const wrappedHBarEvmAddress = saucerSwapV2ConfigService.getWrappedHBarEvmAddress()

        //ExactInputParams
        const exactInputParams = {
            path: routeDataWithFee, //'0x...'
            recipient: recipientAddress, //'0x...' - user's recipient address
            deadline: Math.floor(Date.now() / 1000) + SAUCER_SWAP_CONFIG.DEFAULT_DEADLINE_SECONDS, // Unix seconds from now
            amountIn: amountIn, //in Tinybar
            amountOutMinimum: 0//in token's smallest unit
        };

        
        //encode each function individually
        const swapEncoded = abiSwapRouterInterface.encodeFunctionData('exactInput', [exactInputParams]);
        const refundHBAREncoded = abiSwapRouterInterface.encodeFunctionData('refundETH');

        
        //multi-call parameter: bytes[]
        const multiCallParam = [swapEncoded, refundHBAREncoded];
        
        //get encoded data for the multicall involving both functions
        const encodedData = abiSwapRouterInterface.encodeFunctionData('multicall', [multiCallParam]);  
        
        //get encoded data as Uint8Array
        const functionParameters = ethers.getBytes(encodedData);

        let response = {
          contractId: swapRouterContractId.toString(),
          functionParameters,
          gas: SAUCER_SWAP_CONFIG.SWAP_GAS_LIMIT,
          payableAmount: undefined as number | undefined,
        };
          
        if(inputTokenEVM === wrappedHBarEvmAddress) {
          response.payableAmount = amountIn;
        }

        return response;
    }
}
