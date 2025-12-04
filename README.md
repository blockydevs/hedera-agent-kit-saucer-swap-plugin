# SaucerSwap Plugin for Hedera Agent Kit

A plugin for the Hedera Agent Kit that enables SaucerSwap V2 DeFi operations on Hedera, including token swaps and quote queries.

## Features

- **Token Swaps**: Execute token swaps on SaucerSwap V2 protocol
- **Quote Queries**: Get swap quotes to estimate output amounts before executing swaps
- **Network Support**: Works with Hedera Mainnet and Testnet
- **Automatic Pool Discovery**: Automatically finds the best pool for token pairs

## Installation

```bash
npm install saucer-swap-plugin
```

## Usage

### With Hedera Agent Kit

```typescript
import { HederaAIToolkit, AgentMode } from "hedera-agent-kit";
import { saucerSwapPlugin } from "saucer-swap-plugin";

const hederaAgentToolkit = new HederaAIToolkit({
  client,
  configuration: {
    plugins: [saucerSwapPlugin],
    context: {
      mode: AgentMode.RETURN_BYTES,
    },
  },
});
```

### With LangChain

```typescript
import { HederaLangchainToolkit, AgentMode } from "hedera-agent-kit";
import { saucerSwapPlugin } from "saucer-swap-plugin";

const hederaAgentToolkit = new HederaLangchainToolkit({
  client,
  configuration: {
    plugins: [saucerSwapPlugin],
    context: {
      mode: AgentMode.AUTONOMOUS,
    },
  },
});
```

## Available Tools

### Implemented Tools

- **`get_swap_quote_v2_tool`** - Get a quote for swapping tokens
  - Parameters:
    - `tokenIn` (string, required): The input token address
    - `tokenOut` (string, required): The output token address
    - `amountIn` (number, required): The amount of input tokens to swap
  - Returns: The estimated output amount and exchange rate

- **`swap_v2_tool`** - Execute a token swap on SaucerSwap V2
  - Parameters:
    - `tokenIn` (string, required): The input token address
    - `tokenOut` (string, required): The output token address
    - `amountIn` (number, required): The amount of input tokens to swap
    - `recipientAddress` (string, optional): The address to receive the output tokens (defaults to operator account)
  - Returns: Transaction ID and swap confirmation

## Configuration

The plugin uses pre-configured network addresses for SaucerSwap V2 contracts. The configuration is automatically selected based on the Hedera client's ledger ID (Mainnet or Testnet).

Network addresses are defined in the plugin configuration:
- **Router**: Handles swap execution
- **Factory**: Manages pool creation
- **Quoter**: Provides quote calculations
- **Wrapped HBAR**: Wrapped HBAR token address

For the latest contract addresses, refer to:
- [SaucerSwap Documentation](https://docs.saucerswap.finance/home)
- SaucerSwap GitHub repository
- Hedera ecosystem documentation

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check without building
npm run type-check

# Watch mode for development
npm run dev
```

## Example

See the `examples/` directory for a complete example of using the plugin with LangChain and OpenAI.

## License

MIT
