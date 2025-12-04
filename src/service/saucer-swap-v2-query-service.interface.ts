export interface SaucerSwapV2QueryService {
    getSwapQuote(inputToken: string, outputToken: string, amountIn: number, poolFeesInHexFormat: string): Promise<number>
    getDecimals(tokenEvmAddress: string): Promise<number>
}