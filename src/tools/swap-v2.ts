import SaucerSwapV2ParameterNormaliser from "../saucer-swap-v2-parameter-normaliser";
import { swapV2Parameters } from "../saucer-swap.zod";
import {
    AccountResolver,
    AgentMode,
    Context,
    getMirrornodeService,
    handleTransaction,
    HederaBuilder,
    HederaParameterNormaliser,
    PromptGenerator,
    RawTransactionResponse,
    Tool,
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

const swapV2Prompt = (context: Context = {}) => {
    return `
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
}

const postProcess = (response: RawTransactionResponse) => {
    return `
    Swap successful.
    Transaction ID: ${response.transactionId}
    `;
}

const resolveSignerAccountId = (context: Context, client: Client): string | undefined => {
    if (context.mode === AgentMode.RETURN_BYTES) {
        return context.accountId;
    }
    return client.operatorAccountId?.toString();
}

const ensureTokenAssociated = async (
    recipientAccountId: string,
    tokenOutHederaId: string,
    context: Context,
    client: Client,
    mirrorNode: ReturnType<typeof getMirrornodeService>,
) => {
    const associated = await isTokenAssociated(recipientAccountId, tokenOutHederaId, mirrorNode);
    if (associated) return;

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
        `Associated token ${tokenOutHederaId} with account ${recipientAccountId}`
    );
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

        const recipientAccountId = AccountResolver.resolveAccount(params.recipientAddress, context, client);
        const tokenOutHederaId = getHederaTokenAddress(params.tokenOut);
        await ensureTokenAssociated(recipientAccountId, tokenOutHederaId, context, client, mirrorNode);

        const tokenInEvm = getHederaTokenEVMAddress(params.tokenIn);
        const wrappedHBarEvm = saucerSwapV2ConfigService.getWrappedHBarEvmAddress();
        const isInputWrappedHBAR = tokenInEvm.toLowerCase() === wrappedHBarEvm.toLowerCase();
        if (!isInputWrappedHBAR) {
            const tokenInHederaId = getHederaTokenAddress(params.tokenIn);
            const pool = await PoolFinderService.findPoolForTokens(tokenInHederaId, tokenOutHederaId, saucerSwapApiService);
            const decimals = getTokenDecimals(pool, tokenInHederaId);
            const amountInBase = toBaseUnit(params.amountIn, decimals).toNumber();
            const ownerAccountId = resolveSignerAccountId(context, client);
            if (!ownerAccountId) {
                throw new SaucerSwapError('Cannot resolve owner account for token allowance', 'OWNER_UNRESOLVED');
            }
            const spenderAccountId = saucerSwapV2ConfigService.getSwapRouterContractId().toString();
            await ensureTokenAllowance(ownerAccountId, spenderAccountId, tokenInHederaId, amountInBase, context, client, mirrorNode);
        }

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
