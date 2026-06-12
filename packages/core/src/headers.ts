import type { AgentAccessDecision, AgentIdentity, Budget, ReceiptRecord } from "./types.js";

export interface AgentHeaderInput {
  agent: AgentIdentity;
  purpose: string;
  use: string;
  budget?: Budget;
  traceId: string;
}

export function buildAgentAccessHeaders(input: AgentHeaderInput): Headers {
  const headers = new Headers();
  headers.set("AA-Agent-ID", input.agent.id);
  if (input.agent.name) headers.set("AA-Agent-Name", input.agent.name);
  if (input.agent.operator) headers.set("AA-Agent-Operator", input.agent.operator);
  if (input.agent.principal) headers.set("AA-Agent-Principal", input.agent.principal);
  if (input.agent.contact) headers.set("AA-Agent-Contact", input.agent.contact);
  headers.set("AA-Purpose", input.purpose);
  headers.set("AA-Use", input.use);
  if (input.budget) headers.set("AA-Budget", `${input.budget.currency}:${input.budget.amount}`);
  headers.set("AA-Trace-ID", input.traceId);
  headers.set("AA-Respect-Policy", "true");
  headers.set("AA-Protocol-Version", "0.1");
  return headers;
}

export function parseAgentAccessHeaders(headers: Headers): AgentHeaderInput | undefined {
  const agentId = headers.get("AA-Agent-ID");
  const purpose = headers.get("AA-Purpose");
  const use = headers.get("AA-Use");
  const traceId = headers.get("AA-Trace-ID");
  if (!agentId || !purpose || !use || !traceId) {
    return undefined;
  }
  const budgetHeader = headers.get("AA-Budget");
  const budget = budgetHeader?.includes(":")
    ? { currency: budgetHeader.split(":")[0], amount: budgetHeader.split(":").slice(1).join(":") }
    : undefined;
  return {
    agent: {
      id: agentId,
      name: headers.get("AA-Agent-Name") ?? undefined,
      operator: headers.get("AA-Agent-Operator") ?? undefined,
      principal: headers.get("AA-Agent-Principal") ?? undefined,
      contact: headers.get("AA-Agent-Contact") ?? undefined
    },
    purpose,
    use,
    budget,
    traceId
  };
}

export interface SiteDecisionHeaderInput {
  decision: AgentAccessDecision;
  policyRef?: string;
  traceId: string;
  rateLimitLimit?: number;
  rateLimitRemaining?: number;
  attributionRequired?: boolean;
  retention?: string;
  receiptId?: string;
}

export function buildSiteDecisionHeaders(input: SiteDecisionHeaderInput): Headers {
  const headers = new Headers();
  headers.set("AA-Decision", input.decision);
  if (input.policyRef) headers.set("AA-Policy-Ref", input.policyRef);
  headers.set("AA-Trace-ID", input.traceId);
  if (input.rateLimitLimit !== undefined) headers.set("AA-RateLimit-Limit", String(input.rateLimitLimit));
  if (input.rateLimitRemaining !== undefined) headers.set("AA-RateLimit-Remaining", String(input.rateLimitRemaining));
  if (input.attributionRequired !== undefined) headers.set("AA-Attribution-Required", String(input.attributionRequired));
  if (input.retention) headers.set("AA-Retention", input.retention);
  if (input.receiptId) headers.set("AA-Receipt-ID", input.receiptId);
  return headers;
}

export function parseSiteDecisionHeaders(headers: Headers) {
  return {
    decision: headers.get("AA-Decision") as AgentAccessDecision | null,
    policyRef: headers.get("AA-Policy-Ref"),
    traceId: headers.get("AA-Trace-ID"),
    rateLimitLimit: headers.get("AA-RateLimit-Limit"),
    rateLimitRemaining: headers.get("AA-RateLimit-Remaining"),
    attributionRequired: headers.get("AA-Attribution-Required"),
    retention: headers.get("AA-Retention"),
    receiptId: headers.get("AA-Receipt-ID")
  };
}

export function receiptFromResponseHeaders(headers: Headers): Partial<ReceiptRecord> {
  return {
    rate: {
      limit: headers.get("AA-RateLimit-Limit") ? Number(headers.get("AA-RateLimit-Limit")) : undefined,
      remaining: headers.get("AA-RateLimit-Remaining") ? Number(headers.get("AA-RateLimit-Remaining")) : undefined,
      retryAfter: headers.get("Retry-After") ? Number(headers.get("Retry-After")) : undefined
    }
  };
}
