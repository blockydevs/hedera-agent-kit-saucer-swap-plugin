import { IHederaMirrornodeService } from "@hashgraph/hedera-agent-kit";

export async function isTokenAssociated(
    accountId: string,
    tokenId: string,
    mirrorNode: IHederaMirrornodeService,
): Promise<boolean> {
    const balances = await mirrorNode.getAccountTokenBalances(accountId, tokenId);
    return balances.tokens.some(t => t.token_id === tokenId);
}
