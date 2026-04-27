# SaucerSwap Plugin Setup Guide

This guide explains how to obtain the required contract addresses, ABIs, and environment variables for the SaucerSwap plugin.

## Environment Variables

Before using the plugin, you need to set up the following environment variables:

### Required Environment Variables

1. **`SAUCERSWAP_API_KEY`** (required)
   - Used by the plugin to access SaucerSwap's REST API for pool discovery
   - [Contact SaucerSwap team](https://docs.saucerswap.finance/v/developer/rest-api/authentication#getting-an-api-key) by emailing support@saucerswap.finance to obtain this key. 

2. **`ACCOUNT_ID`** (required)
   - Your Hedera account ID in format `0.0.xxxxx`
   - Get this from your Hedera portal or wallet

3. **`PRIVATE_KEY`** (required)
   - Your Hedera account private key in ECDSA format (starts with `302e`)
   - Keep this secure and never commit it to version control

4. **`OPENAI_API_KEY`** (required for LangChain example)
   - Only needed if running the example with OpenAI
   - Get from https://platform.openai.com/api-keys

### Setting Up Environment Variables

For the example application:

1. **Navigate to the examples directory**:
   ```bash
   cd examples/
   ```

2. **Copy the example environment file**:
   ```bash
   cp .example.env .env
   ```

3. **Edit the `.env` file** and replace the placeholder values with your actual credentials:
   ```bash
   # Edit with your preferred editor
   nano .env
   # or
   code .env
   ```

4. **Never commit your `.env` file** - it's already in `.gitignore` for security

## Required Information

To complete the plugin setup, you also need:

1. **Contract Addresses** (for both mainnet and testnet):
   - SaucerSwap Router contract address
   - SaucerSwap Factory contract address  
   - Wrapped HBAR (WHBAR) contract address

2. **Contract ABIs**:
   - Router ABI (for swap functions)
   - Factory ABI (for pool creation and queries)
   - Pair/Pool ABI (for liquidity operations)
   - ERC20 ABI (for token interactions)

## Where to Find This Information

### 1. SaucerSwap Documentation
- Visit: https://docs.saucerswap.finance/home
- Look for "Contract Addresses" or "Deployments" section
- Check for network-specific addresses (mainnet/testnet)

### 2. SaucerSwap GitHub Repository
- Search for SaucerSwap's official GitHub repository
- Look for deployment scripts or configuration files
- Check for `deployments.json` or similar files

### 3. Hedera Ecosystem Resources
- Check Hedera's official documentation for verified contracts
- Look for Hedera DeFi ecosystem documentation
- Contact Hedera community for verified addresses

### 4. Blockchain Explorers
- Use Hedera block explorers to find deployed contracts
- Search for SaucerSwap-related contract deployments
- Verify contract addresses through multiple sources

## Configuration Steps

Once you have the addresses and ABIs:

### 1. Update Contract Addresses
Edit `src/plugins/saucerswap/config.ts`:

```typescript
export const saucerSwapConfig = {
  networks: {
    mainnet: {
      router: "0x[ACTUAL_ROUTER_ADDRESS]", // Replace with real address
      factory: "0x[ACTUAL_FACTORY_ADDRESS]", // Replace with real address
      wrappedHBAR: "0x[ACTUAL_WHBAR_ADDRESS]", // Replace with real address
      defaultFeeTiersBps: [25, 30, 100], // Verify with SaucerSwap docs
    },
    testnet: {
      router: "0x[ACTUAL_ROUTER_ADDRESS]", // Replace with real address
      factory: "0x[ACTUAL_FACTORY_ADDRESS]", // Replace with real address
      wrappedHBAR: "0x[ACTUAL_WHBAR_ADDRESS]", // Replace with real address
      defaultFeeTiersBps: [25, 30, 100], // Verify with SaucerSwap docs
    },
  },
  // ... rest of config
};
```

### 2. Update Contract ABIs
Replace the placeholder ABI files in `src/plugins/saucerswap/abi/`:

- `Router.json` - Router contract ABI
- `Factory.json` - Factory contract ABI  
- `Pair.json` - Pair/Pool contract ABI
- `ERC20.json` - Standard ERC20 ABI

### 3. Verify Fee Tiers
Check SaucerSwap documentation for supported fee tiers:
- Common tiers: 0.25% (25 bps), 0.30% (30 bps), 1.00% (100 bps)
- Update `defaultFeeTiersBps` array accordingly

## Testing the Configuration

After updating the addresses and ABIs:

1. **Build the plugin**:
   ```bash
   npm run build
   ```

2. **Test on testnet**:
   - Use testnet addresses for initial testing
   - Verify contract interactions work correctly
   - Test with small amounts first

3. **Validate mainnet addresses**:
   - Double-check mainnet addresses before production use
   - Verify through multiple sources
   - Test with minimal amounts if possible

## Security Considerations

- **Verify all addresses** through official sources
- **Never use unverified contract addresses** in production
- **Test thoroughly** on testnet before mainnet deployment
- **Keep addresses updated** if contracts are upgraded

## Getting Help

If you can't find the required information:

1. **Check SaucerSwap community channels** (Discord, Telegram, etc.)
2. **Contact SaucerSwap team directly**
3. **Ask in Hedera community forums**
4. **Check recent Hedera ecosystem updates**

## Next Steps

Once you have the real addresses and ABIs:

1. **Set up environment variables** (see Environment Variables section above)
2. Update the configuration files with real contract addresses
3. Replace placeholder ABIs with actual contract ABIs
4. Test the plugin functionality on testnet first
5. Deploy and use the plugin

Remember to keep your credentials secure and verify all addresses before use!

