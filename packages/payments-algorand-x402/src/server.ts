import { buildAlgorandX402Accepts, priceToUsdString } from "./accepts.js";
import type { AlgorandX402ServerConfig } from "./types.js";

export function createAlgorandX402ServerPaymentAdapter(config: AlgorandX402ServerConfig) {
  return {
    type: "x402",
    settlement: "algorand",
    network: config.network ?? "testnet",
    enabled: Boolean(config.enabled),
    accepts: buildAlgorandX402Accepts(config),
    async middleware(routePrices?: Record<string, string>) {
      if (!config.enabled) {
        return undefined;
      }
      try {
        const x402Hono = await import("@x402/hono");
        const paymentMiddleware = (x402Hono as Record<string, unknown>).paymentMiddleware as
          | ((payTo: string, routes: Record<string, string>, options?: unknown) => unknown)
          | undefined;
        if (paymentMiddleware && config.payTo) {
          return paymentMiddleware(config.payTo, routePrices ?? { "*": priceToUsdString(config.price) }, {
            facilitatorUrl: config.facilitatorUrl ?? "https://facilitator.goplausible.xyz",
            network: config.network ?? "testnet"
          });
        }
      } catch {
        return undefined;
      }
      return undefined;
    }
  };
}
