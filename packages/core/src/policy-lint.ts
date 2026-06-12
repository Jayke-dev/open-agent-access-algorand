import type { AgentAccessPolicy, AgentAccessRule } from "./types.js";

export type PolicyLintSeverity = "error" | "warning" | "info";

export interface PolicyLintFinding {
  severity: PolicyLintSeverity;
  code: string;
  message: string;
  ruleId?: string;
}

export interface PolicyLintResult {
  ok: boolean;
  findings: PolicyLintFinding[];
}

export function lintAgentAccessPolicy(policy: AgentAccessPolicy, now = new Date()): PolicyLintResult {
  const findings: PolicyLintFinding[] = [];

  if (policy.expiresAt && Date.parse(policy.expiresAt) <= now.getTime()) {
    findings.push({
      severity: "error",
      code: "policy_expired",
      message: `Policy expired at ${policy.expiresAt}`
    });
  }

  if (policy.defaults?.decision === "allow") {
    findings.push({
      severity: "warning",
      code: "unsafe_default_allow",
      message: "Default decision is allow; prefer review or deny and explicit allow rules"
    });
  }

  if (!policy.defaults?.respectRobotsTxt) {
    findings.push({
      severity: "warning",
      code: "robots_not_declared",
      message: "Policy should explicitly declare respectRobotsTxt: true"
    });
  }

  if (!policy.site.securityContact) {
    findings.push({
      severity: "info",
      code: "missing_security_contact",
      message: "A securityContact helps agents and site owners resolve incidents"
    });
  }

  const seenRuleIds = new Set<string>();
  const seenMatchFingerprints = new Map<string, string>();
  for (const rule of policy.rules) {
    lintRule(rule, findings, now);
    if (seenRuleIds.has(rule.id)) {
      findings.push({
        severity: "error",
        code: "duplicate_rule_id",
        message: `Duplicate rule id: ${rule.id}`,
        ruleId: rule.id
      });
    }
    seenRuleIds.add(rule.id);

    const fingerprint = ruleMatchFingerprint(rule);
    const previous = seenMatchFingerprints.get(fingerprint);
    if (previous) {
      findings.push({
        severity: "warning",
        code: "duplicate_match",
        message: `Rule has same method/path match as earlier rule ${previous}; it may be unreachable depending on purpose/use`,
        ruleId: rule.id
      });
    } else {
      seenMatchFingerprints.set(fingerprint, rule.id);
    }
  }

  return {
    ok: !findings.some((finding) => finding.severity === "error"),
    findings
  };
}

function lintRule(rule: AgentAccessRule, findings: PolicyLintFinding[], now: Date) {
  if (rule.expiresAt && Date.parse(rule.expiresAt) <= now.getTime()) {
    findings.push({
      severity: "warning",
      code: "rule_expired",
      message: `Rule expired at ${rule.expiresAt}`,
      ruleId: rule.id
    });
  }

  if (rule.decision === "charge") {
    if (!rule.price) {
      findings.push({
        severity: "error",
        code: "charge_without_price",
        message: "Charge rule must declare a price",
        ruleId: rule.id
      });
    }
    if (!rule.payment) {
      findings.push({
        severity: "error",
        code: "charge_without_payment",
        message: "Charge rule must declare payment metadata",
        ruleId: rule.id
      });
    }
    if (!rule.receipt?.required) {
      findings.push({
        severity: "warning",
        code: "paid_receipt_not_required",
        message: "Paid rules should require receipts",
        ruleId: rule.id
      });
    }
  }

  if ((rule.decision === "allow" || rule.decision === "charge") && !rule.rateLimit) {
    findings.push({
      severity: "warning",
      code: "missing_rate_limit",
      message: "Allow and charge rules should declare rate limits",
      ruleId: rule.id
    });
  }

  const explicitlyHandlesTraining = rule.training === false || rule.deniedUses?.includes("ai-train") || (rule.decision === "deny" && rule.uses?.includes("ai-train"));
  if (!explicitlyHandlesTraining) {
    findings.push({
      severity: "info",
      code: "training_not_explicit",
      message: "Rule does not explicitly deny or disable AI training",
      ruleId: rule.id
    });
  }

  if (rule.decision === "allow" && rule.attribution?.required !== true) {
    findings.push({
      severity: "info",
      code: "attribution_not_required",
      message: "Allowed read/summarize routes often benefit from attribution requirements",
      ruleId: rule.id
    });
  }
}

function ruleMatchFingerprint(rule: AgentAccessRule) {
  const methods = [...(rule.match?.methods ?? ["*"])].map((method) => method.toUpperCase()).sort();
  const paths = [...(rule.match?.paths ?? ["*"])].sort();
  return `${methods.join(",")} ${paths.join(",")}`;
}
