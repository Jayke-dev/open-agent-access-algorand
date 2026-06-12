import { assertPaymentMayProceed } from "./config.js";
import type { AlgorandX402ClientConfig } from "./types.js";

export function createAlgorandX402ClientPaymentAdapter(config: AlgorandX402ClientConfig) {
  return {
    type: "x402",
    settlement: "algorand",
    network: config.network ?? "testnet",
    enabled: Boolean(config.enabled),
    async wrapFetch(fetchImpl: typeof fetch = fetch) {
      return wrapFetchWithAlgorandX402Payment(fetchImpl, config);
    }
  };
}

export async function wrapFetchWithAlgorandX402Payment(fetchImpl: typeof fetch, config: AlgorandX402ClientConfig): Promise<typeof fetch> {
  assertPaymentMayProceed(config);

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const mnemonicEnv = config.mnemonicEnv ?? "AVM_MNEMONIC";
    const mnemonic = process.env[mnemonicEnv];
    try {
      const x402Fetch = await import("@x402/fetch");
      const avm = await import("@x402/avm");
      const wrap = (x402Fetch as Record<string, unknown>).wrapFetchWithPayment as
        | ((fetcher: typeof fetch, account: unknown, options?: unknown) => typeof fetch)
        | undefined;
      const accountFactory = (avm as Record<string, unknown>).accountFromMnemonic as ((secret: string) => unknown) | undefined;
      if (wrap && (config.signer || (accountFactory && mnemonic))) {
        const account = config.signer ?? accountFactory?.(mnemonic as string);
        return wrap(fetchImpl, account, { network: config.network ?? "testnet", facilitatorUrl: config.facilitatorUrl })(input, init);
      }
    } catch {
      throw new Error("Algorand x402 payment requested, but @x402/fetch/@x402/avm could not be loaded or initialized");
    }
    throw new Error("Algorand x402 payment requested, but no compatible signer factory was found");
  };
}
