import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendReceipt,
  budgetAllowsPrice,
  buildAgentAccessHeaders,
  buildSiteDecisionHeaders,
  decideAccess,
  exportDigest,
  hashCanonicalJson,
  parseAgentAccessHeaders,
  parseSiteDecisionHeaders,
  pathMatches,
  readReceiptLedger,
  validateAgentAccessPolicy,
  verifyReceiptChain,
  type AgentAccessPolicy
} from "../src/index.js";

const policy: AgentAccessPolicy = {
  version: "0.1",
  protocol: "open-agent-access",
  site: { name: "Example", origin: "https://example.com" },
  defaults: { decision: "review", requireAgentIdentity: true, requirePurpose: true },
  rules: [
    {
      id: "docs",
      match: { methods: ["GET"], paths: ["/docs/**"] },
      decision: "allow",
      purposes: ["research"],
      uses: ["read"],
      deniedUses: ["ai-train"],
      rateLimit: { requests: 2, window: "1m" }
    },
    {
      id: "premium",
      match: { methods: ["GET"], paths: ["/premium/**"] },
      decision: "charge",
      purposes: ["research"],
      uses: ["ai-input"],
      price: { amount: "0.005", currency: "USD", unit: "request" }
    }
  ]
};

describe("policy and decisions", () => {
  it("validates policy schema", () => {
    expect(validateAgentAccessPolicy(policy).rules).toHaveLength(2);
  });

  it("matches double-star paths", () => {
    expect(pathMatches("/docs/**", "/docs/a/b")).toBe(true);
    expect(pathMatches("/docs/**", "/blog/a")).toBe(false);
  });

  it("allows matching purpose and use", () => {
    const decision = decideAccess(policy, {
      url: "https://example.com/docs/a",
      method: "GET",
      purpose: "research",
      use: "read",
      agent: { id: "did:web:agent.example" }
    });
    expect(decision.decision).toBe("allow");
    expect(decision.rule?.id).toBe("docs");
  });

  it("denies denied use", () => {
    const decision = decideAccess(policy, {
      url: "https://example.com/docs/a",
      method: "GET",
      purpose: "research",
      use: "ai-train",
      agent: { id: "did:web:agent.example" }
    });
    expect(decision.decision).toBe("deny");
  });

  it("uses defaults when no rule matches", () => {
    const decision = decideAccess(policy, {
      url: "https://example.com/unknown",
      method: "GET",
      purpose: "research",
      use: "read",
      agent: { id: "did:web:agent.example" }
    });
    expect(decision.decision).toBe("review");
  });

  it("compares budgets", () => {
    expect(budgetAllowsPrice({ amount: "0.05", currency: "USD" }, { amount: "0.005", currency: "USD" })).toBe(true);
    expect(budgetAllowsPrice({ amount: "0.001", currency: "USD" }, { amount: "0.005", currency: "USD" })).toBe(false);
  });

  it("hashes canonical JSON independent of key order", () => {
    expect(hashCanonicalJson({ b: 1, a: 2 })).toBe(hashCanonicalJson({ a: 2, b: 1 }));
  });
});

describe("headers", () => {
  it("builds and parses agent headers", () => {
    const headers = buildAgentAccessHeaders({
      agent: { id: "did:web:a", name: "A", operator: "Ops", principal: "user:1", contact: "mailto:a@example.com" },
      purpose: "research",
      use: "read",
      budget: { currency: "USD", amount: "0.05" },
      traceId: "trace"
    });
    expect(parseAgentAccessHeaders(headers)?.agent.id).toBe("did:web:a");
    expect(parseAgentAccessHeaders(headers)?.budget?.amount).toBe("0.05");
  });

  it("builds and parses site headers", () => {
    const headers = buildSiteDecisionHeaders({
      decision: "allow",
      policyRef: "policy#rule",
      traceId: "trace",
      rateLimitLimit: 10,
      rateLimitRemaining: 9,
      attributionRequired: true,
      retention: "30d",
      receiptId: "receipt"
    });
    expect(parseSiteDecisionHeaders(headers).decision).toBe("allow");
    expect(parseSiteDecisionHeaders(headers).receiptId).toBe("receipt");
  });
});

describe("receipts", () => {
  it("appends, verifies, digests, reads, and detects tampering", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oaa-"));
    const ledger = join(dir, "receipts.jsonl");
    await appendReceipt(ledger, {
      receiptVersion: "0.1",
      receiptType: "agent_access",
      role: "agent",
      traceId: "trace-1",
      method: "GET",
      url: "https://example.com/a",
      origin: "https://example.com",
      payment: { required: false }
    });
    await appendReceipt(ledger, {
      receiptVersion: "0.1",
      receiptType: "agent_access",
      role: "agent",
      traceId: "trace-2",
      method: "GET",
      url: "https://example.com/b",
      origin: "https://example.com",
      payment: { required: false }
    });
    expect((await readReceiptLedger(ledger))).toHaveLength(2);
    expect((await verifyReceiptChain(ledger)).valid).toBe(true);
    expect((await exportDigest(ledger)).count).toBe(2);

    const text = await readFile(ledger, "utf8");
    await writeFile(ledger, text.replace("trace-2", "trace-x"), "utf8");
    expect((await verifyReceiptChain(ledger)).valid).toBe(false);
  });
});
