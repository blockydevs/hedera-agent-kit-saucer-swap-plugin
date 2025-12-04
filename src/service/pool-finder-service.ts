import { SaucerSwapApiService } from "./saucer-swap-rest-pools-service.interface";
import { SaucerSwapV2CompactPool } from "./saucer-swap-rest-pools-service.interface";
import { PoolNotFoundError } from "../errors";

/**
 * Service for finding pools by token pairs
 */
export class PoolFinderService {
  /**
   * Finds a pool for the given token pair
   * 
   * @param tokenA - Hedera token address (e.g., "0.0.123456")
   * @param tokenB - Hedera token address (e.g., "0.0.789012")
   * @param apiService - SaucerSwap API service instance
   * @returns The pool matching the token pair
   * @throws {PoolNotFoundError} If no pool exists for the token pair
   */
  static async findPoolForTokens(
    tokenA: string,
    tokenB: string,
    apiService: SaucerSwapApiService
  ): Promise<SaucerSwapV2CompactPool> {
    const pools = await apiService.getAllPoolsCompact();
    
    const pool = pools.find(
      p => (p.tokenA.id === tokenA && p.tokenB.id === tokenB) ||
           (p.tokenA.id === tokenB && p.tokenB.id === tokenA)
    );
    
    if (!pool) {
      throw new PoolNotFoundError(tokenA, tokenB);
    }
    
    return pool;
  }
}

