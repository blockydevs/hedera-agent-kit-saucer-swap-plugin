import { SaucerSwapV2QueryService } from './saucer-swap-v2-query-service.interface'
import { LedgerId } from '@hashgraph/sdk'
import { ethers } from 'ethers'
import QuoterV2Abi from '../abi/QuoterV2.json' assert { type: 'json' }
import ERC20Abi from '../abi/ERC20.json' assert { type: 'json' }
import { IHederaMirrornodeService } from 'hedera-agent-kit'
import { SaucerSwapV2ConfigService } from './saucer-swap-v2-config-service'
import { SAUCER_SWAP_CONFIG } from '../constants'
import { MirrorNodeError, InvalidAmountError } from '../errors'

export class SaucerSwapV2QueryServiceImpl implements SaucerSwapV2QueryService {

    private readonly abiQuoterInterface: ethers.Interface
    private readonly abiERC20Interface: ethers.Interface
    private readonly quoterEvmAddress: string
    private readonly mirrorNodeService: IHederaMirrornodeService
    private readonly saucerSwapV2ConfigService: SaucerSwapV2ConfigService

    constructor(ledgerId: LedgerId, mirrorNodeService: IHederaMirrornodeService, saucerSwapV2ConfigService: SaucerSwapV2ConfigService) {
        this.mirrorNodeService = mirrorNodeService
        this.saucerSwapV2ConfigService = saucerSwapV2ConfigService
        this.abiQuoterInterface = new ethers.Interface(QuoterV2Abi)
        this.abiERC20Interface = new ethers.Interface(ERC20Abi)
        this.quoterEvmAddress = this.saucerSwapV2ConfigService.getQuoterAddress()
    }

    /**
     * Gets a swap quote for the specified token pair
ken - The EVM address        const poolFeesInHexFormat = this.saucerSwapV2ConfigService.getPoolFeesInHexFormat(inputToken, outputToken);
 of the input token
     * @param outputToken - The EVM address of the output token
     * @param amountIn - The amount of input tokens in base units
     * @param poolFeesInHexFormat - The pool fee in hex format (e.g., "0x001e" for 30 bps)
     * @returns The amount of output tokens that would be received
     * @throws {MirrorNodeError} If the mirror node call fails
     */
    async getSwapQuote(
        inputToken: string,
        outputToken: string,
        amountIn: number,
        poolFeesInHexFormat: string
    ): Promise<number> {
        // Validate inputs
        if (amountIn <= 0) {
            throw new InvalidAmountError(amountIn);
        }

        const encodedData = this.abiQuoterInterface.encodeFunctionData(
            this.abiQuoterInterface.getFunction('quoteExactInputSingle')!,
            [{
                tokenIn: inputToken,
                tokenOut: outputToken,
                amountIn: amountIn,
                fee: poolFeesInHexFormat,
                sqrtPriceLimitX96: 0
            }]
        )

        const url = `${this.mirrorNodeService.getBaseUrl()}/contracts/call`
        const body = {
            data: encodedData,
            from: SAUCER_SWAP_CONFIG.MIRROR_NODE_FROM_ADDRESS,
            to: this.quoterEvmAddress,
            block: "latest",
            estimate: false,
            gas: SAUCER_SWAP_CONFIG.QUOTE_GAS_LIMIT,
            gasPrice: SAUCER_SWAP_CONFIG.DEFAULT_GAS_PRICE,
            value: 0,
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        })
        
        if (!response.ok) {
            throw new MirrorNodeError(
                `Call failed with status ${response.status}`,
                response.status
            );
        }

        const json: any = await response.json()
        const decoded = this.abiQuoterInterface.decodeFunctionResult('quoteExactInputSingle', json.result) as any
        return Number(decoded.amountOut);
    }

    /**
     * Gets the decimals for a token
     * 
     * @param tokenEvmAddress - The EVM address of the token
     * @returns The number of decimals for the token
     * @throws {MirrorNodeError} If the mirror node call fails
     */
    async getDecimals(tokenEvmAddress: string): Promise<number> {
        const encodedData = this.abiERC20Interface.encodeFunctionData(
            this.abiERC20Interface.getFunction('decimals')!,
            []
        )

        const url = `${this.mirrorNodeService.getBaseUrl()}/contracts/call`
        const body = {
            data: encodedData,
            from: SAUCER_SWAP_CONFIG.MIRROR_NODE_FROM_ADDRESS,
            to: tokenEvmAddress,
            block: "latest",
            estimate: false,
            gas: SAUCER_SWAP_CONFIG.DECIMALS_GAS_LIMIT,
            gasPrice: SAUCER_SWAP_CONFIG.DEFAULT_GAS_PRICE,
            value: 0,
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        })
        
        if (!response.ok) {
            throw new MirrorNodeError(
                `Call failed with status ${response.status}`,
                response.status
            );
        }

        interface MirrorNodeResponse {
            result: string;
        }

        const json = await response.json() as MirrorNodeResponse;
        const decoded = this.abiERC20Interface.decodeFunctionResult(
            'decimals',
            json.result
        ) as unknown as [number];

        return decoded[0];
    }
}