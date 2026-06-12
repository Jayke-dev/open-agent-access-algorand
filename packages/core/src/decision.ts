import type { AgentAccessDecision, AgentAccessPolicy, AgentAccessRequest, AgentAccessRule, DecisionResult } from "./types.js";

function escapeRegex(input: string): string {
  return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

export function pathPatternToRegex(pattern: string): RegExp {
  let regex = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === "*" && next === "*") {
      regex += ".*";
      index += 1;
    } else if (char === "*") {
      regex += "[^/]*";
    } else {
      regex += escapeRegex(char);
    }
  }
  return new RegExp(`^${regex}$`);
}

export function pathMatches(pattern: string, path: string): boolean {
  return pathPatternToRegex(pattern).test(path);
}

export function ruleMatchesRequest(rule: AgentAccessRule, request: AgentAccessRequest): boolean {
  if (rule.expiresAt && Date.parse(rule.expiresAt) <= (request.now?.getTime() ?? Date.now())) {
    return false;
  }
  const method = (request.method ?? "GET").toUpperCase();
  const pathname = new URL(request.url).pathname;
  const methods = rule.match?.methods?.map((entry) => entry.toUpperCase());
  if (methods?.length && !methods.includes(method)) {
    return false;
  }
  const paths = rule.match?.paths;
  if (paths?.length && !paths.some((pattern) => pathMatches(pattern, pathname))) {
    return false;
  }
  return true;
}

function useAllowed(rule: AgentAccessRule, use?: string): boolean {
  if (!use) {
    return true;
  }
  if (rule.deniedUses?.includes(use)) {
    return false;
  }
  const allowed = rule.uses ?? rule.allowedUses;
  return !allowed?.length || allowed.includes(use);
}

function purposeAllowed(rule: AgentAccessRule, purpose?: string): boolean {
  if (!purpose) {
    return true;
  }
  if (rule.deniedPurposes?.includes(purpose)) {
    return false;
  }
  return !rule.purposes?.length || rule.purposes.includes(purpose);
}

export function decideAccess(policy: AgentAccessPolicy, request: AgentAccessRequest): DecisionResult {
  if (policy.expiresAt && Date.parse(policy.expiresAt) <= (request.now?.getTime() ?? Date.now())) {
    return { decision: "review", reason: "policy_expired" };
  }
  if (policy.defaults?.requireAgentIdentity && !request.agent?.id) {
    return { decision: "review", reason: "agent_identity_required" };
  }
  if (policy.defaults?.requirePurpose && !request.purpose) {
    return { decision: "review", reason: "purpose_required" };
  }

  for (const rule of policy.rules) {
    if (!ruleMatchesRequest(rule, request)) {
      continue;
    }
    if (!purposeAllowed(rule, request.purpose)) {
      return { decision: "deny", rule, reason: "purpose_denied" };
    }
    if (!useAllowed(rule, request.use)) {
      return { decision: "deny", rule, reason: "use_denied" };
    }
    return {
      decision: rule.decision,
      rule,
      reason: "matched_rule",
      rateLimit: rule.rateLimit
    };
  }

  return {
    decision: policy.defaults?.decision ?? "review",
    reason: "default_decision"
  };
}

export function isTerminalDecision(decision: AgentAccessDecision): boolean {
  return decision === "deny" || decision === "review" || decision === "human_only" || decision === "redirect_to_api";
}
