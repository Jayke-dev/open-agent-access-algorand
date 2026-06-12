import { validateAgentAccessPolicy } from "./policy.js";
import type { AgentAccessPolicy } from "./types.js";

export interface DiscoveredPolicy {
  url: string;
  policy: AgentAccessPolicy;
  response: Response;
}

export function policyUrlForResource(resourceUrl: string): string {
  const url = new URL(resourceUrl);
  return `${url.origin}/.well-known/agent-access.json`;
}

export async function discoverPolicy(resourceUrl: string, fetchImpl: typeof fetch = fetch): Promise<DiscoveredPolicy> {
  const policyUrl = policyUrlForResource(resourceUrl);
  const response = await fetchImpl(policyUrl, {
    headers: {
      "Accept": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Policy discovery failed for ${policyUrl}: HTTP ${response.status}`);
  }
  const json = await response.json();
  return {
    url: policyUrl,
    policy: validateAgentAccessPolicy(json),
    response
  };
}
