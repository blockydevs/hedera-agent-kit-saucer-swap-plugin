import {
    BaseTool,
    Context,
    PromptGenerator,
    getMirrornodeService,
    untypedQueryOutputParser,
} from "@hashgraph/hedera-agent-kit";
import { z } from 'zod';
import type { Client } from "@hiero-ledger/sdk";
import { getSwapQuoteV2Parameters, getSwapQuoteV2ParametersNormalised } from "../saucer-swap.zod";
import { SaucerSwapV2QueryServiceImpl } from "../service/saucer-swap-v2-query-service-impl";
import SaucerSwapV2ParameterNormaliser from "../saucer-swap-v2-parameter-normaliser";
import { SaucerSwapV2ConfigService } from "../service/saucer-swap-v2-config-service";
import { SaucerSwapApiServiceImpl } from "../service/saucer-swap-rest-pools-service";
import { SaucerSwapError } from "../errors";

const getSwapQuoteV2Prompt = (context: Context = {}) => {
    const contextSnippet = PromptGenerator.getContextSnippet(context);
    const usageInstructions = PromptGenerator.getParameterUsageInstructions();

    return `
${contextSnippet}

This tool will get a quote for swapping from tokenIn to tokenOut. Provide either optional.amountIn (exact-in) or optional.amountOut (exact-out).

Parameters:
- tokenIn (str, required): The input token address.
- tokenOut (str, required): The output token address.
- amountIn (number, required): The amount of input tokens to swap.
${usageInstructions}

Example: "Get quote for swapping 1000000000000000000 amountIn from 0x1234567890abcdef1234567890abcdef12345678 tokenIn to 0xabcdef1234567890abcdef1234567890abcdef12345678 tokenOut"
`;
};

const postProcess = (
    quote: number,
    tokenAmountInBaseUnit: number,
    params: z.infer<ReturnType<typeof getSwapQuoteV2ParametersNormalised>>,
) =>
    `Swapping ${tokenAmountInBaseUnit} token: ${params.tokenIn} to token: ${params.tokenOut} will result in ${quote} token: ${params.tokenOut}, the rate used is ${quote / tokenAmountInBaseUnit}`;

type GetSwapQuoteV2RawParams = z.infer<ReturnType<typeof getSwapQuoteV2Parameters>>;
type GetSwapQuoteV2NormalisedParams = z.infer<ReturnType<typeof getSwapQuoteV2ParametersNormalised>>;

export const GET_SWAP_QUOTE_V2_TOOL = "get_swap_quote_v2_tool" as const;

export class GetSwapQuoteV2Tool extends BaseTool<GetSwapQuoteV2RawParams, GetSwapQuoteV2NormalisedParams> {
    method = GET_SWAP_QUOTE_V2_TOOL;
    name = "Get Quote (SaucerSwap V2)";
    description: string;
    parameters: ReturnType<typeof getSwapQuoteV2Parameters>;
    outputParser = untypedQueryOutputParser;

    constructor(context: Context) {
        super();
        this.description = getSwapQuoteV2Prompt(context);
        this.parameters = getSwapQuoteV2Parameters();
    }

    async normalizeParams(
        params: GetSwapQuoteV2RawParams,
        context: Context,
        client: Client,
    ): Promise<GetSwapQuoteV2NormalisedParams> {
        const config = new SaucerSwapV2ConfigService(client.ledgerId!);
        const api = new SaucerSwapApiServiceImpl(client.ledgerId!, config.getSaucerSwapApiKey());
        return await SaucerSwapV2ParameterNormaliser.normaliseGetSwapQuoteV2Params(params, context, api);
    }

    async coreAction(
        normalisedParams: GetSwapQuoteV2NormalisedParams,
        context: Context,
        client: Client,
    ) {
        const mirrorNode = getMirrornodeService(context.mirrornodeService, client.ledgerId!);
        const config = new SaucerSwapV2ConfigService(client.ledgerId!);
        const queryService = new SaucerSwapV2QueryServiceImpl(client.ledgerId!, mirrorNode, config);
        const quote = await queryService.getSwapQuote(
            normalisedParams.tokenIn,
            normalisedParams.tokenOut,
            normalisedParams.amountIn,
            normalisedParams.poolFeesInHexFormat.toLowerCase(),
        );
        return {
            raw: { quote },
            humanMessage: postProcess(quote, normalisedParams.amountIn, normalisedParams),
        };
    }

    async shouldSecondaryAction(_coreActionResult: unknown, _context: Context) {
        return false;
    }

    async secondaryAction(_request: unknown, _client: Client, _context: Context) {
        return null;
    }

    async handleError(error: unknown, _context: Context) {
        const desc = 'Failed to get quote';
        let message: string;
        if (error instanceof SaucerSwapError) {
            message = `${desc}: ${error.message} (code: ${error.code})`;
        } else if (error instanceof Error) {
            message = `${desc}: ${error.message}`;
        } else {
            message = `${desc}: Unknown error occurred`;
        }
        console.error('[get_quote_tool]', message, error);
        return { raw: { error: message }, humanMessage: message };
    }
}

const tool = (context: Context) => new GetSwapQuoteV2Tool(context);

export default tool;
