# Codebase Improvement Proposal

This document outlines comprehensive improvements for the SaucerSwap Plugin codebase, organized by priority and category.

## 🔴 Critical Issues

### 1. Type Safety Improvements

**Issues:**
- Use of `any` types in multiple places (e.g., `saucer-swap-v2-query-service-impl.ts:58, 99`)
- Inconsistent primitive types (`String` vs `string` in interfaces)
- Missing proper error types
- Potential null/undefined access issues

**Recommendations:**
- Replace all `any` types with proper TypeScript types
- Use `string` consistently (not `String`)
- Create custom error classes for better error handling
- Add null checks and use optional chaining where appropriate
- Enable stricter TypeScript compiler options

**Files to fix:**
- `src/service/saucer-swap-v2-query-service-impl.ts`
- `src/service/saucer-swap-v2-query-service.interface.ts`
- `src/saucer-swap-v2-parameter-normaliser.ts`

### 2. File Naming Issue

**Issue:**
- File `saucer-swap-v2-service-impl..ts` has double dots in filename

**Recommendation:**
- Rename to `saucer-swap-v2-service-impl.ts`

### 3. Error Handling Consistency

**Issues:**
- Inconsistent error handling patterns across files
- Some errors are swallowed or not properly typed
- Missing error context in some catch blocks

**Recommendations:**
- Create custom error classes (`SaucerSwapError`, `PoolNotFoundError`, etc.)
- Standardize error handling patterns
- Always include context in error messages
- Use error codes for programmatic error handling

## 🟡 High Priority Improvements

### 4. Code Duplication

**Issues:**
- Duplicate path encoding logic in `saucer-swap-v2-parameter-normaliser.ts` and `saucer-swap-v2-service-impl..ts`
- Similar pool finding logic repeated in multiple places
- Duplicate hex conversion utilities

**Recommendations:**
- Extract common logic into shared utility functions
- Create a centralized pool finder service
- Consolidate hex conversion utilities

**Example:**
```typescript
// Create a shared service for pool operations
class PoolService {
  async findPool(tokenA: string, tokenB: string): Promise<SaucerSwapV2CompactPool | null> {
    // Centralized pool finding logic
  }
}
```

### 5. Configuration Management

**Issues:**
- Multiple TODOs in config file
- Missing validation for configuration values
- Hardcoded values scattered throughout code
- Environment variable handling could be improved

**Recommendations:**
- Complete configuration with actual contract addresses
- Add configuration validation on startup
- Move all magic numbers to constants
- Create a configuration validator
- Provide better error messages for missing config

### 6. Missing Input Validation

**Issues:**
- Limited validation in parameter normalizers
- Missing validation for token addresses
- No validation for amount ranges
- Missing deadline validation

**Recommendations:**
- Add comprehensive input validation
- Validate token addresses format
- Validate amount is positive and within reasonable bounds
- Validate deadline is in the future
- Add slippage validation

### 7. Hardcoded Values

**Issues:**
- Hardcoded gas limits (e.g., `15000000` in multiple places)
- Hardcoded deadline values
- Hardcoded "from" address in mirror node calls
- Magic numbers without explanation

**Recommendations:**
- Move all constants to `constants.ts`
- Use named constants instead of magic numbers
- Make gas limits configurable
- Document why specific values are used

**Example:**
```typescript
// Instead of hardcoded 15000000
const QUOTE_GAS_LIMIT = 15_000_000; // Sufficient for quote operations
```

## 🟢 Medium Priority Improvements

### 8. Missing Tests

**Issues:**
- No test files found in the codebase
- Missing unit tests for critical functions
- No integration tests
- No test coverage

**Recommendations:**
- Add unit tests for utility functions
- Add integration tests for service implementations
- Test error handling paths
- Add tests for parameter normalization
- Set up test coverage reporting
- Add CI/CD pipeline for running tests

**Suggested test structure:**
```
src/
  __tests__/
    utils/
      swap-path.test.ts
      utils.test.ts
    service/
      saucer-swap-v2-query-service-impl.test.ts
      saucer-swap-v2-service-impl.test.ts
    tools/
      get-swap-quote-v2.test.ts
      swap-v2.test.ts
```

### 9. Documentation

**Issues:**
- Missing JSDoc comments for public APIs
- Complex logic lacks inline comments
- Missing README sections for development
- No API documentation

**Recommendations:**
- Add JSDoc comments to all public functions
- Document complex algorithms
- Add examples in documentation
- Create API documentation
- Document error codes and meanings

**Example:**
```typescript
/**
 * Gets a swap quote for the specified token pair.
 * 
 * @param inputToken - The EVM address of the input token
 * @param outputToken - The EVM address of the output token
 * @param amountIn - The amount of input tokens in base units
 * @param poolFeesInHexFormat - The pool fee in hex format (e.g., "0x001e")
 * @returns The amount of output tokens that would be received
 * @throws {PoolNotFoundError} If no pool exists for the token pair
 * @throws {MirrorNodeError} If the mirror node call fails
 */
async getSwapQuote(...): Promise<number>
```

### 10. Performance Optimizations

**Issues:**
- No caching for pool data (fetched on every request)
- Multiple sequential API calls that could be parallelized
- No request deduplication

**Recommendations:**
- Implement caching for pool data with TTL
- Use Promise.all for parallel operations where possible
- Implement request deduplication for identical queries
- Add connection pooling for HTTP requests

**Example:**
```typescript
class PoolCache {
  private cache = new Map<string, { data: SaucerSwapV2CompactPool[], expires: number }>();
  private TTL = 60_000; // 1 minute

  async getPools(apiService: SaucerSwapApiService): Promise<SaucerSwapV2CompactPool[]> {
    const key = 'all-pools';
    const cached = this.cache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    const pools = await apiService.getAllPoolsCompact();
    this.cache.set(key, { data: pools, expires: Date.now() + this.TTL });
    return pools;
  }
}
```

### 11. Code Organization

**Issues:**
- Utility functions scattered across files
- Some files are too large and could be split
- Inconsistent file structure

**Recommendations:**
- Group related utilities together
- Split large files into smaller, focused modules
- Create a clear directory structure
- Use barrel exports for cleaner imports

### 12. Security Improvements

**Issues:**
- API key handling could be improved
- Missing input sanitization in some places
- No rate limiting considerations

**Recommendations:**
- Use environment variables for sensitive data
- Add input sanitization
- Document security best practices
- Add rate limiting considerations
- Validate all external inputs

## 🔵 Low Priority / Nice to Have

### 13. Logging

**Issues:**
- Inconsistent logging (some console.error, some console.log)
- No structured logging
- Missing log levels

**Recommendations:**
- Use a proper logging library (e.g., `winston`, `pino`)
- Implement structured logging
- Add log levels (debug, info, warn, error)
- Add request IDs for tracing

### 14. Monitoring & Observability

**Issues:**
- No metrics collection
- No performance monitoring
- No error tracking

**Recommendations:**
- Add metrics for API calls
- Track error rates
- Monitor performance metrics
- Add health check endpoints

### 15. Code Style Consistency

**Issues:**
- Inconsistent spacing and formatting
- Mixed quote styles
- Inconsistent naming conventions

**Recommendations:**
- Use Prettier for code formatting
- Configure ESLint with strict rules
- Enforce consistent naming conventions
- Add pre-commit hooks

### 16. Type Exports

**Issues:**
- Some types are not exported
- Missing type definitions for public APIs

**Recommendations:**
- Export all public types
- Create a types index file
- Ensure all interfaces are properly exported

### 17. Dead Code

**Issues:**
- Unused imports
- Commented out code
- Unused utility functions

**Recommendations:**
- Remove unused code
- Clean up commented code
- Use tools to detect dead code

## Implementation Priority

1. **Phase 1 (Critical):**
   - Fix type safety issues
   - Fix file naming
   - Improve error handling
   - Add input validation

2. **Phase 2 (High Priority):**
   - Remove code duplication
   - Complete configuration
   - Extract hardcoded values
   - Add basic tests

3. **Phase 3 (Medium Priority):**
   - Add comprehensive tests
   - Improve documentation
   - Performance optimizations
   - Code organization

4. **Phase 4 (Low Priority):**
   - Logging improvements
   - Monitoring
   - Code style consistency
   - Type exports

## Specific Code Improvements

### Fix Type Safety in Query Service

```typescript
// Before
const json: any = await response.json()
const decoded = this.abiQuoterInterface.decodeFunctionResult('quoteExactInputSingle', json.result) as any

// After
interface QuoteResponse {
  result: string;
}

interface DecodedQuote {
  amountOut: bigint;
  sqrtPriceX96After: bigint;
  initializedTicksCrossed: bigint;
  gasEstimate: bigint;
}

const json = await response.json() as QuoteResponse;
const decoded = this.abiQuoterInterface.decodeFunctionResult(
  'quoteExactInputSingle', 
  json.result
) as DecodedQuote;
```

### Extract Pool Finding Logic

```typescript
// Create a new service
class PoolFinderService {
  async findPoolForTokens(
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
      throw new PoolNotFoundError(`Pool not found for tokens ${tokenA} and ${tokenB}`);
    }
    
    return pool;
  }
}
```

### Create Custom Error Classes

```typescript
export class SaucerSwapError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SaucerSwapError';
  }
}

export class PoolNotFoundError extends SaucerSwapError {
  constructor(tokenA: string, tokenB: string) {
    super(`Pool not found for tokens ${tokenA} and ${tokenB}`, 'POOL_NOT_FOUND');
    this.name = 'PoolNotFoundError';
  }
}

export class InvalidTokenAddressError extends SaucerSwapError {
  constructor(address: string) {
    super(`Invalid token address: ${address}`, 'INVALID_TOKEN_ADDRESS');
    this.name = 'InvalidTokenAddressError';
  }
}
```

## Testing Strategy

1. **Unit Tests:**
   - Test all utility functions
   - Test parameter normalization
   - Test error handling
   - Mock external dependencies

2. **Integration Tests:**
   - Test service implementations
   - Test tool executions
   - Test with mock mirror node

3. **E2E Tests:**
   - Test complete swap flow
   - Test quote retrieval
   - Test error scenarios

## Conclusion

This codebase has a solid foundation but would benefit significantly from the improvements outlined above. Prioritizing type safety, error handling, and code organization will make the codebase more maintainable, testable, and reliable.

The most critical improvements are:
1. Fixing type safety issues
2. Removing code duplication
3. Adding comprehensive tests
4. Improving error handling

These changes will significantly improve code quality and developer experience.

