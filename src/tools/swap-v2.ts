import SaucerSwapV2ParameterNormaliser from "../saucer-swap-v2-parameter-normaliser";
import { swapV2Parameters } from "../saucer-swap.zod";
import {
    AccountResolver,
    AgentMode,
    BaseTool,
    Context,
    contractExecuteTransactionParametersNormalised,
    getMirrornodeService,
    handleTransaction,
    HederaBuilder,
    HederaParameterNormaliser,
    PromptGenerator,
    RawTransactionResponse,
    transactionToolOutputParser,
} from "@hashgraph/hedera-agent-kit";
import { z } from "zod";
import { Client, Status } from "@hiero-ledger/sdk";
import { SaucerSwapV2ConfigService } from "../service/saucer-swap-v2-config-service";
import { SaucerSwapApiServiceImpl } from "../service/saucer-swap-rest-pools-service";
import { SaucerSwapError, TokenNotAssociatedError } from "../errors";
import { getHederaTokenAddress, getHederaTokenEVMAddress, getTokenDecimals, toBaseUnit } from "../utils";
import { isTokenAssociated } from "../utils/token-association";
import { ensureTokenAllowance } from "../utils/token-allowance";
import { PoolFinderService } from "../service/pool-finder-service";

const swapV2Prompt = (context: Context = {}) => `
${PromptGenerator.getContextSnippet(context)}

This tool will swap tokens using the SaucerSwap V2 protocol. If the recipient
has not associated the output token, the tool will associate it first (only
works when the recipient equals the signing account; otherwise the call fails
with a clear error and the recipient must associate the token themselves).
When tokenIn is not native HBAR / WHBAR, the tool also grants an
AccountAllowance to the SwapRouter contract for amountIn before swapping.

Parameters:
- tokenIn (str, required): The input token address
- tokenOut (str, required): The output token address
- amountIn (number, required): The amount of input tokens to swap
- recipientAddress (str, required): The address to receive the output tokens
`;

const postProcess = (response: RawTransactionResponse) =>
    `Swap successful.\nTransaction ID: ${response.transactionId}`;

const resolveSignerAccountId = (context: Context, client: Client): string | undefined => {
    if (context.mode === AgentMode.RETURN_BYTES) {
        return context.accountId;
    }
    return client.operatorAccountId?.toString();
};

const ensureTokenAssociated = async (
    recipientAccountId: string,
    tokenOutHederaId: string,
    context: Context,
    client: Client,
    mirrorNode: ReturnType<typeof getMirrornodeService>,
) => {
    if (await isTokenAssociated(recipientAccountId, tokenOutHederaId, mirrorNode)) return;

    const signer = resolveSignerAccountId(context, client);
    if (!signer || signer !== recipientAccountId) {
        throw new TokenNotAssociatedError(recipientAccountId, tokenOutHederaId, signer);
    }

    const associateParams = HederaParameterNormaliser.normaliseAssociateTokenParams(
        { accountId: recipientAccountId, tokenIds: [tokenOutHederaId] },
        context,
        client,
    );
    const associateTx = HederaBuilder.associateToken(associateParams);
    await handleTransaction(associateTx, client, context, () =>
        `Associated token ${tokenOutHederaId} with account ${recipientAccountId}`,
    );
};

type SwapV2RawParams = z.infer<ReturnType<typeof swapV2Parameters>>;

type SwapV2NormalisedParams = {
    swapParams: z.infer<ReturnType<typeof contractExecuteTransactionParametersNormalised>>;
    prep: {
        recipientAccountId: string;
        tokenInHederaId: string;
        tokenOutHederaId: string;
        amountInBase: number | undefined;
        spenderAccountId: string | undefined;
        isInputWrappedHBAR: boolean;
    };
};

export const SWAP_V2_TOOL = 'swap_v2_tool';

export class SwapV2Tool extends BaseTool<SwapV2RawParams, SwapV2NormalisedParams> {
    method = SWAP_V2_TOOL;
    name = 'Swap V2';
    description: string;
    parameters: ReturnType<typeof swapV2Parameters>;
    outputParser = transactionToolOutputParser;

    constructor(context: Context) {
        super();
        this.description = swapV2Prompt(context);
        this.parameters = swapV2Parameters();
    }

    async normalizeParams(
        params: SwapV2RawParams,
        context: Context,
        client: Client,
    ): Promise<SwapV2NormalisedParams> {
        const mirrorNode = getMirrornodeService(context.mirrornodeService, client.ledgerId!);
        const config = new SaucerSwapV2ConfigService(client.ledgerId!);
        const api = new SaucerSwapApiServiceImpl(client.ledgerId!, config.getSaucerSwapApiKey());

        const recipientAccountId = AccountResolver.resolveAccount(params.recipientAddress, context, client);
        const tokenInHederaId = getHederaTokenAddress(params.tokenIn);
        const tokenOutHederaId = getHederaTokenAddress(params.tokenOut);
        const tokenInEvm = getHederaTokenEVMAddress(params.tokenIn);
        const wrappedHBarEvm = config.getWrappedHBarEvmAddress();
        const isInputWrappedHBAR = tokenInEvm.toLowerCase() === wrappedHBarEvm.toLowerCase();

        let amountInBase: number | undefined;
        let spenderAccountId: string | undefined;
        if (!isInputWrappedHBAR) {
            const pool = await PoolFinderService.findPoolForTokens(tokenInHederaId, tokenOutHederaId, api);
            const decimals = getTokenDecimals(pool, tokenInHederaId);
            amountInBase = toBaseUnit(params.amountIn, decimals).toNumber();
            spenderAccountId = config.getSwapRouterContractId().toString();
        }

        const swapParams = await SaucerSwapV2ParameterNormaliser.normaliseSwapV2Params(
            params, context, config, api, mirrorNode, client,
        );

        return {
            swapParams,
            prep: {
                recipientAccountId,
                tokenInHederaId,
                tokenOutHederaId,
                amountInBase,
                spenderAccountId,
                isInputWrappedHBAR,
            },
        };
    }

    async coreAction(
        normalisedParams: SwapV2NormalisedParams,
        context: Context,
        client: Client,
    ) {
        const mirrorNode = getMirrornodeService(context.mirrornodeService, client.ledgerId!);
        const { swapParams, prep } = normalisedParams;

        await ensureTokenAssociated(prep.recipientAccountId, prep.tokenOutHederaId, context, client, mirrorNode);

        if (!prep.isInputWrappedHBAR) {
            const ownerAccountId = resolveSignerAccountId(context, client);
            if (!ownerAccountId) {
                throw new SaucerSwapError('Cannot resolve owner account for token allowance', 'OWNER_UNRESOLVED');
            }
            await ensureTokenAllowance(
                ownerAccountId,
                prep.spenderAccountId!,
                prep.tokenInHederaId,
                prep.amountInBase!,
                context,
                client,
                mirrorNode,
            );
        }

        return HederaBuilder.executeTransaction(swapParams);
    }

    async secondaryAction(
        transaction: ReturnType<typeof HederaBuilder.executeTransaction>,
        client: Client,
        context: Context,
    ) {
        return await handleTransaction(transaction, client, context, postProcess);
    }

    async handleError(error: unknown, _context: Context) {
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
                error: message,
            },
            humanMessage: message,
        };
    }
}

const tool = (context: Context) => new SwapV2Tool(context);

export default tool;
