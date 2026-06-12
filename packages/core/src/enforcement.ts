import { decideAccess } from "./decision.js";
import { buildSiteDecisionHeaders, parseAgentAccessHeaders } from "./headers.js";
import { createReceiptId, createTraceId, hashCanonicalJson } from "./hash.js";
import { InMemoryRateLimiter } from "./rate-limit.js";
import type { AgentAccessPolicy, AgentAccessRule, ReceiptRecord } from "./types.js";

export interface EnforcementRequest {
  url: string;
  method: string;
  headers: Headers;
}

export interface EnforcementResult {
  proceed: boolean;
  status?: number;
  body?: unknown;
  headers: Headers;
  traceId: string;
  receiptId: string;
  rule?: AgentAccessRule;
  receipt: Omit<ReceiptRecord, "receiptVersion" | "receiptType" | "receiptId" | "timestamp" | "previousHash" | "receiptHash">;
}

const limiter = new InMemoryRateLimiter();

export function enforceAgentAccess(policy: AgentAccessPolicy, policyHash: string, request: EnforcementRequest, options: { policyUrl?: string } = {}): EnforcementResult {
  const parsed = parseAgentAccessHeaders(request.headers);
  const traceId = parsed?.traceId ?? createTraceId();
  const receiptId = createReceiptId();
  const requestUrl = new URL(request.url);
  const decision = decideAccess(policy, {
    url: request.url,
    method: request.method,
    purpose: parsed?.purpose,
    use: parsed?.use,
    budget: parsed?.budget,
    agent: parsed?.agent
  });
  const rateResult = decision.rateLimit
    ? limiter.check(`${parsed?.agent.id ?? requestUrl.hostname}:${decision.rule?.id ?? "default"}`, decision.rateLimit)
    : undefined;
  const finalDecision = rateResult && !rateResult.allowed ? { ...decision, decision: "throttle" as const, reason: "rate_limited" } : decision;
  const headers = buildSiteDecisionHeaders({
    decision: finalDecision.decision,
    policyRef: `${options.policyUrl ?? `${requestUrl.origin}/.well-known/agent-access.json`}#${decision.rule?.id ?? "default"}`,
    traceId,
    receiptId,
    rateLimitLimit: rateResult?.limit,
    rateLimitRemaining: rateResult?.remaining,
    attributionRequired: decision.rule?.attribution?.required,
    retention: decision.rule?.retention?.maxAge
  });
  headers.set("AA-Policy-Hash", policyHash);
  headers.set("AA-Payment-Resource", hashCanonicalJson({
    method: request.method.toUpperCase(),
    url: request.url,
    policyHash,
    ruleId: decision.rule?.id,
    traceId
  }));
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  if (rateResult?.retryAfter) headers.set("Retry-After", String(rateResult.retryAfter));

  const receipt = {
    role: "site" as const,
    traceId,
    method: request.method,
    url: request.url,
    origin: requestUrl.origin,
    agent: parsed?.agent,
    declared: {
      purpose: parsed?.purpose,
      use: parsed?.use,
      budget: parsed?.budget
    },
    policy: {
      url: options.policyUrl,
      ruleId: decision.rule?.id,
      policyHash,
      decision: finalDecision.decision
    },
    rate: {
      limit: rateResult?.limit,
      remaining: rateResult?.remaining,
      retryAfter: rateResult?.retryAfter
    },
    payment: {
      required: decision.decision === "charge",
      type: decision.rule?.payment?.type,
      settlement: decision.rule?.payment?.settlement,
      network: decision.rule?.payment?.network,
      asset: decision.rule?.payment?.asset,
      price: decision.rule?.price,
      facilitatorUrl: decision.rule?.payment?.facilitatorUrl,
      settlementSuccess: false
    }
  };

  if (finalDecision.decision === "allow") {
    return { proceed: true, headers, traceId, receiptId, rule: decision.rule, receipt };
  }
  if (finalDecision.decision === "charge") {
    const status = 402;
    return {
      proceed: false,
      status,
      headers,
      traceId,
      receiptId,
      rule: decision.rule,
      receipt: { ...receipt, response: { status } },
      body: {
        error: "payment_required",
        decision: "charge",
        ruleId: decision.rule?.id,
        traceId,
        policyHash,
        payment: {
          type: decision.rule?.payment?.type ?? "x402",
          settlement: decision.rule?.payment?.settlement,
          network: decision.rule?.payment?.network,
          price: decision.rule?.price
        }
      }
    };
  }
  const status = finalDecision.decision === "throttle" ? 429 : finalDecision.decision === "redirect_to_api" ? 307 : 403;
  return {
    proceed: false,
    status,
    headers,
    traceId,
    receiptId,
    rule: decision.rule,
    receipt: { ...receipt, response: { status } },
    body: {
      error: finalDecision.reason,
      decision: finalDecision.decision,
      ruleId: decision.rule?.id
    }
  };
}
