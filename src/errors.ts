/**
 * Custom error classes for SaucerSwap plugin
 */

export class SaucerSwapError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SaucerSwapError';
    Object.setPrototypeOf(this, SaucerSwapError.prototype);
  }
}

export class PoolNotFoundError extends SaucerSwapError {
  constructor(tokenA: string, tokenB: string) {
    super(
      `Pool not found for tokens ${tokenA} and ${tokenB}`,
      'POOL_NOT_FOUND'
    );
    this.name = 'PoolNotFoundError';
    Object.setPrototypeOf(this, PoolNotFoundError.prototype);
  }
}

export class InvalidTokenAddressError extends SaucerSwapError {
  constructor(address: string) {
    super(`Invalid token address: ${address}`, 'INVALID_TOKEN_ADDRESS');
    this.name = 'InvalidTokenAddressError';
    Object.setPrototypeOf(this, InvalidTokenAddressError.prototype);
  }
}

export class InvalidAmountError extends SaucerSwapError {
  constructor(amount: number | string) {
    super(`Invalid amount: ${amount}. Amount must be greater than zero`, 'INVALID_AMOUNT');
    this.name = 'InvalidAmountError';
    Object.setPrototypeOf(this, InvalidAmountError.prototype);
  }
}

export class MirrorNodeError extends SaucerSwapError {
  constructor(message: string, public readonly statusCode?: number) {
    super(`Mirror Node error: ${message}`, 'MIRROR_NODE_ERROR');
    this.name = 'MirrorNodeError';
    Object.setPrototypeOf(this, MirrorNodeError.prototype);
  }
}

export class ConfigurationError extends SaucerSwapError {
  constructor(message: string) {
    super(`Configuration error: ${message}`, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

