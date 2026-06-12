import { readFile } from "node:fs/promises";
import { agentAccessPolicySchema } from "./policy-schema.js";
import type { AgentAccessPolicy } from "./types.js";
import { hashCanonicalJson } from "./hash.js";

export function validateAgentAccessPolicy(input: unknown): AgentAccessPolicy {
  return agentAccessPolicySchema.parse(input) as AgentAccessPolicy;
}

export function safeValidateAgentAccessPolicy(input: unknown) {
  return agentAccessPolicySchema.safeParse(input);
}

export async function readPolicyFile(path: string): Promise<AgentAccessPolicy> {
  const text = await readFile(path, "utf8");
  return validateAgentAccessPolicy(JSON.parse(text));
}

export function hashPolicy(policy: AgentAccessPolicy): string {
  return hashCanonicalJson(policy);
}
