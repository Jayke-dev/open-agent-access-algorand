import type { AgentAccessPolicy } from "./types.js";

export type PolicyTemplateName = "publisher" | "paid-api" | "mcp-tool" | "docs-site" | "research-friendly";

export const policyTemplateNames: PolicyTemplateName[] = ["publisher", "paid-api", "mcp-tool", "docs-site", "research-friendly"];

export function createPolicyTemplate(name: PolicyTemplateName, origin = "https://example.com"): AgentAccessPolicy {
  const siteName = titleCase(name);
  const base: Pick<AgentAccessPolicy, "version" | "protocol" | "site" | "defaults"> = {
    version: "0.1",
    protocol: "open-agent-access",
    site: {
      name: siteName,
      origin,
      contact: "mailto:agents@example.com",
      securityContact: "mailto:security@example.com",
      terms: `${origin}/agent-terms`
    },
    defaults: {
      decision: "review",
      respectRobotsTxt: true,
      requireAgentIdentity: true,
      requirePurpose: true,
      requireReceipt: true
    }
  };

  if (name === "paid-api") {
    return {
      ...base,
      rules: [
        {
          id: "metered-api-x402",
          match: { methods: ["GET", "POST"], paths: ["/api/**"] },
          decision: "charge",
          purposes: ["research", "monitoring", "agentic-commerce"],
          uses: ["read", "ai-input"],
          deniedUses: ["ai-train"],
          price: { amount: "0.002", currency: "USD", unit: "request" },
          payment: {
            type: "x402",
            settlement: "algorand",
            network: "testnet",
            scheme: "exact",
            asset: "USDC",
            assetIdEnv: "USDC_TESTNET_ASA_ID",
            payToEnv: "AVM_ADDRESS",
            facilitatorUrlEnv: "FACILITATOR_URL"
          },
          rateLimit: { requests: 120, window: "1m", burst: 20, respectRetryAfter: true },
          receipt: { required: true, signing: "optional-v0" }
        }
      ]
    };
  }

  if (name === "mcp-tool") {
    return {
      ...base,
      rules: [
        {
          id: "mcp-read-tools",
          match: { methods: ["POST"], paths: ["/mcp/tools/read/**"] },
          decision: "allow",
          purposes: ["research", "accessibility", "workflow-automation"],
          uses: ["read", "summarize", "ai-input"],
          deniedUses: ["ai-train"],
          rateLimit: { requests: 60, window: "1m", burst: 10, respectRetryAfter: true },
          attribution: { required: true, format: "tool-name-and-origin" },
          retention: { maxAge: "30d", allowEmbedding: false }
        },
        {
          id: "mcp-paid-actions",
          match: { methods: ["POST"], paths: ["/mcp/tools/action/**"] },
          decision: "charge",
          purposes: ["agentic-commerce", "workflow-automation"],
          uses: ["tool-call", "ai-input"],
          deniedUses: ["ai-train"],
          price: { amount: "0.005", currency: "USD", unit: "tool-call" },
          payment: {
            type: "x402",
            settlement: "algorand",
            network: "testnet",
            scheme: "exact",
            asset: "USDC",
            assetIdEnv: "USDC_TESTNET_ASA_ID",
            payToEnv: "AVM_ADDRESS",
            facilitatorUrlEnv: "FACILITATOR_URL"
          },
          rateLimit: { requests: 30, window: "1m", burst: 5, respectRetryAfter: true },
          receipt: { required: true }
        }
      ]
    };
  }

  if (name === "docs-site" || name === "research-friendly") {
    return {
      ...base,
      defaults: { ...base.defaults, decision: name === "docs-site" ? "review" : "allow" },
      rules: [
        {
          id: "public-docs-research",
          match: { methods: ["GET"], paths: ["/docs/**", "/blog/**", "/reference/**"] },
          decision: "allow",
          purposes: ["research", "indexing", "accessibility"],
          uses: ["read", "summarize", "quote", "ai-input"],
          deniedUses: ["ai-train"],
          rateLimit: { requests: 120, window: "1m", burst: 20, respectRetryAfter: true },
          loadPolicy: { maxRps: 2, preferredWindows: ["02:00-05:00 UTC"], preferBulkEndpoint: false },
          attribution: { required: true, format: "source-url" },
          retention: { maxAge: "30d", allowEmbedding: false },
          training: false,
          summarisation: true,
          indexing: true,
          quoteLimit: { maxWords: 120 }
        }
      ]
    };
  }

  return {
    ...base,
    rules: [
      {
        id: "public-research-summaries",
        match: { methods: ["GET"], paths: ["/news/**", "/analysis/**", "/blog/**"] },
        decision: "allow",
        purposes: ["research", "accessibility", "indexing"],
        uses: ["read", "summarize", "quote", "ai-input"],
        deniedUses: ["ai-train"],
        training: false,
        summarisation: true,
        indexing: true,
        quoteLimit: { maxWords: 80 },
        rateLimit: { requests: 60, window: "1m", burst: 10, respectRetryAfter: true },
        loadPolicy: { maxRps: 1, preferredWindows: ["02:00-05:00 UTC"], preferBulkEndpoint: false },
        attribution: { required: true, format: "source-url" },
        retention: { maxAge: "30d", allowEmbedding: false }
      },
      {
        id: "premium-archive-x402",
        match: { methods: ["GET"], paths: ["/archive/premium/**", "/premium/**"] },
        decision: "charge",
        purposes: ["research", "monitoring"],
        uses: ["read", "summarize", "ai-input"],
        deniedUses: ["ai-train"],
        price: { amount: "0.005", currency: "USD", unit: "request" },
        payment: {
          type: "x402",
          settlement: "algorand",
          network: "testnet",
          scheme: "exact",
          asset: "USDC",
          assetIdEnv: "USDC_TESTNET_ASA_ID",
          payToEnv: "AVM_ADDRESS",
          facilitatorUrlEnv: "FACILITATOR_URL"
        },
        rateLimit: { requests: 30, window: "1m", burst: 5, respectRetryAfter: true },
        receipt: { required: true, signing: "optional-v0" }
      }
    ]
  };
}

function titleCase(value: string) {
  return value.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" ");
}
