import { LedgerId } from "@hashgraph/sdk";

export const saucerSwapConfig = {
  networks: {
    [LedgerId.MAINNET.toString()]: {
      router: "0x00000000000000000000000000000000003c437a",
      factory: "0x0000000000000000000000000000000000103780",
      wrappedHBAR: "0x0000000000000000000000000000000000163b5a",
      quoter: "0x00000000000000000000000000000000003c4370",
    },
    [LedgerId.TESTNET.toString()]: {
      router: "0x0000000000000000000000000000000000000000", 
      factory: "0x00000000000000000000000000000000000026e7", 
      wrappedHBAR: "0x0000000000000000000000000000000000003ad1",
      quoter: "0x00000000000000000000000000000000001535b2",
    },
  }
} as const;

// NOTE: To get the actual contract addresses:
// 1. Check SaucerSwap documentation: https://docs.saucerswap.finance/home
// 2. Look for SaucerSwap GitHub repository for deployment addresses
// 3. Check Hedera ecosystem documentation for verified contract addresses
// 4. Contact SaucerSwap team for official contract addresses

export type SaucerSwapConfig = typeof saucerSwapConfig;
