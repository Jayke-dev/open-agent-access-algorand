import { decideAccess, pathMatches } from "./decision.js";
import type { AgentAccessPolicy, AgentAccessRequest, AgentAccessRule, DecisionResult } from "./types.js";

export interface RuleExplanation {
  ruleId: string;
  matched: boolean;
  methodMatched: boolean;
  pathMatched: boolean;
  purposeAllowed: boolean;
  useAllowed: boolean;
  reasons: string[];
}

export interface PolicyExplanation {
  request: {
    url: string;
    method: string;
    purpose?: string;
    use?: string;
  };
  decision: DecisionResult;
  rules: RuleExplanation[];
}

export function explainPolicyDecision(policy: AgentAccessPolicy, request: AgentAccessRequest): PolicyExplanation {
  const normalized = {
    ...request,
    method: (request.method ?? "GET").toUpperCase()
  };
  const decision = decideAccess(policy, normalized);
  return {
    request: {
      url: normalized.url,
      method: normalized.method,
      purpose: normalized.purpose,
      use: normalized.use
    },
    decision,
    rules: policy.rules.map((rule) => explainRule(rule, normalized))
  };
}

function explainRule(rule: AgentAccessRule, request: AgentAccessRequest): RuleExplanation {
  const reasons: string[] = [];
  const method = (request.method ?? "GET").toUpperCase();
  const pathname = new URL(request.url).pathname;
  const methods = rule.match?.methods?.map((entry) => entry.toUpperCase());
  const paths = rule.match?.paths;
  const methodMatched = !methods?.length || methods.includes(method);
  const pathMatched = !paths?.length || paths.some((pattern) => pathMatches(pattern, pathname));
  const purposeAllowed = !request.purpose || !rule.deniedPurposes?.includes(request.purpose)
    && (!rule.purposes?.length || rule.purposes.includes(request.purpose));
  const allowedUses = rule.uses ?? rule.allowedUses;
  const useAllowed = !request.use || !rule.deniedUses?.includes(request.use)
    && (!allowedUses?.length || allowedUses.includes(request.use));

  if (!methodMatched) reasons.push(`method ${method} is not in ${methods?.join(", ")}`);
  if (!pathMatched) reasons.push(`path ${pathname} does not match ${paths?.join(", ")}`);
  if (!purposeAllowed) reasons.push(`purpose ${request.purpose ?? "(missing)"} is not allowed`);
  if (!useAllowed) reasons.push(`use ${request.use ?? "(missing)"} is not allowed`);
  if (rule.expiresAt && Date.parse(rule.expiresAt) <= (request.now?.getTime() ?? Date.now())) {
    reasons.push(`rule expired at ${rule.expiresAt}`);
  }
  if (reasons.length === 0) reasons.push("rule matches request");

  return {
    ruleId: rule.id,
    matched: methodMatched && pathMatched && purposeAllowed && useAllowed,
    methodMatched,
    pathMatched,
    purposeAllowed,
    useAllowed,
    reasons
  };
}
