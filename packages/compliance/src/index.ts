export type ComplianceFramework = "nist-ai-rmf" | "eu-ai-act" | "soc2" | "iso27001" | "nis2";

export interface ComplianceControlMapping {
  id: string;
  framework: ComplianceFramework;
  area: string;
  requirement: string;
  oaaControls: string[];
  evidence: string[];
  notes: string;
}

export interface ComplianceMappingReport {
  reportVersion: "0.1";
  framework: ComplianceFramework;
  generatedAt: string;
  disclaimer: string;
  controls: ComplianceControlMapping[];
}

const mappings: Record<ComplianceFramework, ComplianceControlMapping[]> = {
  "nist-ai-rmf": [
    control("nist-ai-rmf", "NIST-MAP-1", "Govern", "Document roles, responsibilities, policies, and accountability for AI system use.", ["agent-access policy", "mandate graph", "governance docs"], ["agent-access.json", "agent-mandates.json", "GOVERNANCE.md"], "OAA records who may act, for what purpose, under which policy."),
    control("nist-ai-rmf", "NIST-MSR-1", "Measure", "Measure and monitor risks, incidents, and operational behavior.", ["event trails", "receipts", "enterprise risk scoring"], ["receipt ledger", "eventTrailHash", "oaa enterprise report"], "OAA provides reconstructable evidence for access and tool-boundary decisions."),
    control("nist-ai-rmf", "NIST-MNG-1", "Manage", "Apply controls, escalation, and review for identified AI risks.", ["reviewUrl", "human_only", "needs_approval", "revocation"], ["policy reviewUrl", "mandate approval", "agent-stop endpoint"], "OAA supports fail-closed and human escalation paths.")
  ],
  "eu-ai-act": [
    control("eu-ai-act", "EU-TRANS-1", "Transparency", "Make AI-mediated access, provenance, and content-use posture legible.", ["agent headers", "trust passport", "policy discovery"], ["AA-* headers", "trust-passport.json", ".well-known/agent-access.json"], "OAA helps expose machine-readable purpose, use, attribution, and receipt requirements."),
    control("eu-ai-act", "EU-DOC-1", "Technical Documentation", "Maintain documentation and evidence for system operation and risk controls.", ["receipts", "evidence bundles", "policy-as-code export"], ["receiptHash", "evidence bundle", "OPA/Cedar export"], "OAA produces reviewable artifacts but does not replace full provider documentation."),
    control("eu-ai-act", "EU-RISK-1", "Risk Management", "Identify, mitigate, and review high-risk or consequential actions.", ["mandates", "enterprise risk scoring", "signed identity"], ["mandateHash", "risk report", "AA-Agent-Signature"], "OAA binds agent action to authority, policy, and evidence.")
  ],
  soc2: [
    control("soc2", "SOC2-SEC-1", "Security", "Restrict logical access to systems and data.", ["signed agent identity", "policy decisions", "middleware enforcement"], ["trusted-agent-keys.json", "AA-Decision", "middleware config"], "OAA enforces policy before route/tool execution."),
    control("soc2", "SOC2-CC-1", "Change Management", "Track policy and control changes.", ["policy hash", "policy-as-code export", "evidence bundle"], ["policyHash", "policy.rego", "bundleHash"], "OAA hashes source policy and generated review artifacts."),
    control("soc2", "SOC2-MON-1", "Monitoring", "Collect logs and evidence for security-relevant events.", ["SIEM export", "OpenTelemetry export", "receipts"], ["CEF events", "OTel spans", "receipt ledger"], "OAA provides audit exports for monitoring pipelines.")
  ],
  iso27001: [
    control("iso27001", "ISO-AAC-1", "Access Control", "Control access to information and associated assets.", ["policy discovery", "mandates", "signed identity"], ["agent-access.json", "agent-mandates.json", "trusted keys"], "OAA defines who may do what and how identity is verified."),
    control("iso27001", "ISO-LOG-1", "Logging and Monitoring", "Generate, protect, and review event logs.", ["receipts", "event trails", "immutable evidence"], ["receiptHash", "eventHash", "evidence bundle"], "OAA binds events and receipts into tamper-evident manifests."),
    control("iso27001", "ISO-SUP-1", "Supplier and Service Use", "Monitor external service and dependency interactions.", ["payment metadata", "facilitator URL", "policy evidence"], ["payment settlement", "FACILITATOR_URL", "policyHash"], "OAA records payment/facilitator context for agentic access.")
  ],
  nis2: [
    control("nis2", "NIS2-INC-1", "Incident Handling", "Support detection, escalation, and incident evidence.", ["emergency stop", "reviewUrl", "evidence bundles"], ["loadPolicy.emergencyStop", "reviewUrl", "bundleHash"], "OAA provides machine-readable stop and evidence artifacts."),
    control("nis2", "NIS2-SUP-1", "Supply Chain", "Manage supplier and infrastructure risk.", ["facilitator metadata", "policy-as-code", "audit export"], ["payment.facilitatorUrl", "OPA/Cedar export", "CEF export"], "OAA makes agent/resource/payment boundaries inspectable."),
    control("nis2", "NIS2-BCP-1", "Continuity", "Reduce disruption from excessive load or abusive automation.", ["rate limits", "load policy", "preferred windows"], ["rateLimit", "loadPolicy", "Retry-After"], "OAA allows sites to publish load-aware terms.")
  ]
};

export function listComplianceFrameworks(): ComplianceFramework[] {
  return Object.keys(mappings) as ComplianceFramework[];
}

export function getComplianceMapping(framework: ComplianceFramework, now = new Date()): ComplianceMappingReport {
  return {
    reportVersion: "0.1",
    framework,
    generatedAt: now.toISOString(),
    disclaimer: "This mapping is implementation guidance, not legal advice, certification, or a substitute for counsel/auditor review.",
    controls: mappings[framework]
  };
}

export function getAllComplianceMappings(now = new Date()): ComplianceMappingReport[] {
  return listComplianceFrameworks().map((framework) => getComplianceMapping(framework, now));
}

function control(framework: ComplianceFramework, id: string, area: string, requirement: string, oaaControls: string[], evidence: string[], notes: string): ComplianceControlMapping {
  return { id, framework, area, requirement, oaaControls, evidence, notes };
}
