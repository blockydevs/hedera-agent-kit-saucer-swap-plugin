import SaucerSwapV2ParameterNormaliser from "../saucer-swap-v2-parameter-normaliser";
import { swapV2Parameters } from "../saucer-swap.zod";
import { Context, getMirrornodeService, handleTransaction, HederaBuilder, PromptGenerator, RawTransactionResponse, Tool } from "hedera-agent-kit";
import { z } from "zod";
import { Client, Status } from "@hashgraph/sdk";
import { SaucerSwapV2ConfigService } from "../service/saucer-swap-v2-config-service";
import { SaucerSwapApiServiceImpl } from "../service/saucer-swap-rest-pools-service";
import { SaucerSwapError } from "../errors";

const swapV2Prompt = (context: Context = {}) => {
    return `
    ${PromptGenerator.getContextSnippet(context)}

    This tool will swap tokens using the SaucerSwap V2 protocol.

    Parameters:
    - tokenIn (str, required): The input token address
    - tokenOut (str, required): The output token address
    - amountIn (number, required): The amount of input tokens to swap
    - recipientAddress (str, required): The address to receive the output tokens
    `;
}

const postProcess = (response: RawTransactionResponse) => {
    return `
    Swap successful.
    Transaction ID: ${response.transactionId}
    `;   
}

const swapV2 = async (
    client: Client,
    context: Context,
    params: z.infer<ReturnType<typeof swapV2Parameters>>
) => {
    try {   
        const mirrorNode = getMirrornodeService(context.mirrornodeService, client.ledgerId!);
        const saucerSwapV2ConfigService = new SaucerSwapV2ConfigService(client.ledgerId!);
        const saucerSwapApiService = new SaucerSwapApiServiceImpl(client.ledgerId!, saucerSwapV2ConfigService.getSaucerSwapApiKey());
        const normalisedParams = await SaucerSwapV2ParameterNormaliser.normaliseSwapV2Params(params, context, saucerSwapV2ConfigService, saucerSwapApiService, mirrorNode, client);
        const modifiedParams = { ...normalisedParams, gas: normalisedParams.gas };
        const tx = HederaBuilder.executeTransaction(modifiedParams);
        return handleTransaction(tx, client, context, postProcess);
    } catch (error) {
        const desc = 'Failed to swap tokens';
        let message: string;
        
        if (error instanceof SaucerSwapError) {
            message = `${desc}: ${error.message} (code: ${error.code})`;
        } else if (error instanceof Error) {
            message = `${desc}: ${error.message}`;
        } else {
            message = `${desc}: Unknown error occurred`;
        }
        
        console.error('[swap_v2_tool]', message, error);
        return { 
            raw: { 
                status: Status.InvalidTransaction.toString(), 
                accountId: null,
                tokenId: null,
                transactionId: '',
                topicId: null,
                scheduleId: null,
                error: message 
            }, 
            humanMessage: message 
        };
    }
}

export const SWAP_V2_TOOL = 'swap_v2_tool';

const tool = (context: Context): Tool => ({
    method: SWAP_V2_TOOL,
    name: 'Swap V2',
    description: swapV2Prompt(context),
    parameters: swapV2Parameters(),
    execute: swapV2,
    outputParser: (rawOutput: string) => {
        const json = JSON.parse(rawOutput);
        return {
            raw: json,
            humanMessage: json.transactionId,
        };
    },
});

export default tool;