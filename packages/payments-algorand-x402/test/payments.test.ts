import {
  buildAlgorandX402Accepts,
  parseAlgorandX402SettlementHeaders,
  validateAlgorandX402Config,
  wrapFetchWithAlgorandX402Payment
} from "../src/index.js";

describe("Algorand x402 adapter", () => {
  it("validates disabled config without secrets", () => {
    expect(validateAlgorandX402Config({ enabled: false }).valid).toBe(true);
  });

  it("refuses payment without explicit enabled flag", async () => {
    await expect(wrapFetchWithAlgorandX402Payment(fetch, { enabled: false })).rejects.toThrow(/disabled/);
  });

  it("refuses payment above budget", async () => {
    await expect(wrapFetchWithAlgorandX402Payment(fetch, {
      enabled: true,
      signer: {},
      budget: { amount: "0.001", currency: "USD" },
      price: { amount: "0.005", currency: "USD" }
    })).rejects.toThrow(/budget/);
  });

  it("constructs accepts array", () => {
    const accepts = buildAlgorandX402Accepts({
      enabled: true,
      payTo: "TESTADDR",
      price: { amount: "0.005", currency: "USD" },
      asset: "USDC",
      assetId: "123"
    });
    expect(accepts[0].scheme).toBe("exact");
    expect(accepts[0].maxAmountRequired).toBe("$0.005");
  });

  it("parses settlement headers", () => {
    const headers = new Headers({
      "X-PAYMENT-RESPONSE": JSON.stringify({ transactionId: "tx", payer: "payer", payTo: "payto" })
    });
    expect(parseAlgorandX402SettlementHeaders(headers).transactionId).toBe("tx");
  });
});
