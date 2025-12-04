// write a config service to get the config from the config file
import { SaucerSwapConfig, saucerSwapConfig } from "../config";
import { ContractId, LedgerId, TokenId } from "@hashgraph/sdk";

export class SaucerSwapV2ConfigService {
    private readonly saucerSwapConfig: SaucerSwapConfig;
    private readonly ledgerId: LedgerId;

    constructor(ledgerId: LedgerId) {
        this.saucerSwapConfig = saucerSwapConfig;
        this.ledgerId = ledgerId;
    }

    //get router address
    getRouterAddress() {
        return this.saucerSwapConfig.networks[this.ledgerId.toString() as keyof typeof this.saucerSwapConfig.networks]?.router ?? '';
    }

    getSwapRouterContractId() {
        return ContractId.fromEvmAddress(0, 0, this.saucerSwapConfig.networks[this.ledgerId.toString() as keyof typeof this.saucerSwapConfig.networks]?.router ?? '');
    }

    getWrappedHBARTokenId() {
        return TokenId.fromEvmAddress(0, 0, this.saucerSwapConfig.networks[this.ledgerId.toString() as keyof typeof this.saucerSwapConfig.networks]?.wrappedHBAR ?? '');
    }

    getWrappedHBarEvmAddress() {
        return this.saucerSwapConfig.networks[this.ledgerId.toString() as keyof typeof this.saucerSwapConfig.networks]?.wrappedHBAR ?? '';
    }

    getSaucerSwapApiKey() {
        //get the api key from environment variable
        const apiKey = process.env.SAUCERSWAP_API_KEY;
        if (!apiKey) {
            throw new Error('SAUCERSWAP_API_KEY is not set');
        }
        return apiKey;
    }

    //get quoter address
    getQuoterAddress() {
        return this.saucerSwapConfig.networks[this.ledgerId.toString() as keyof typeof this.saucerSwapConfig.networks]?.quoter ?? '';
    }
}