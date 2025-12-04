import { LedgerId } from "@hashgraph/sdk";

export type SaucerSwapRestNetwork = "MAINNET" | "TESTNET";

export type SaucerSwapV2PoolToken = {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  priceUsd: number;
  icon: string;
  price: string;
  dueDiligenceComplete: boolean;
  isFeeOnTransferToken: boolean;
};

export type SaucerSwapV2CompactPool = {
  id: number;
  contractId: string;
  tokenA: SaucerSwapV2PoolToken;
  tokenB: SaucerSwapV2PoolToken;
  amountA: string;
  amountB: string;
  fee: number;
  sqrtRatioX96: string;
  tickCurrent: number;
  liquidity: string;
};

export interface SaucerSwapApiService {
  /**
   * Calls SaucerSwap V2 "Get compact data for all SaucerSwap V2 pools" endpoint.
   * Docs: https://docs.saucerswap.finance/v/developer/rest-api/pools-v2/pools
   */
  getAllPoolsCompact(): Promise<SaucerSwapV2CompactPool[]>;
}

export interface SaucerSwapApiServiceFactoryConfig {
  ledgerId: LedgerId;
  apiKey?: string;
}


