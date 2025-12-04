import { z } from "zod";


export const getSwapQuoteV2Parameters = () => z.object({
  tokenIn: z.string().describe("Input token address"),
  tokenOut: z.string().describe("Output token address"),
  amountIn: z.number().describe("Amount of input tokens to swap"),
});

export const getSwapQuoteV2ParametersNormalised = () => z.object({
  tokenIn: z.string().describe("Input token address"),
  tokenOut: z.string().describe("Output token address"),
  amountIn: z.number().describe("Amount of input tokens to swap"),
  poolFeesInHexFormat: z.string().describe("Pool fees in hex format"),
});

export const swapV2Parameters = () => z.object({
  tokenIn: z.string().describe("Input token address"),
  tokenOut: z.string().describe("Output token address"),
  amountIn: z.number().describe("Amount of input tokens to swap"),
  recipientAddress: z.string().optional().describe("Recipient address"),
});
