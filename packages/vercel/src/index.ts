import {
  appendReceipt,
  enforceAgentAccess,
  hashPolicy,
  readPolicyFile,
  validateAgentAccessPolicy,
  type AgentAccessPolicy,
  type ReceiptLedgerOptions,
  type ReceiptRecord
} from "@kirkelabs/open-agent-access-core";

export interface VercelLikeRequest {
  url: string;
  method: string;
  headers: Headers;
}

export interface AgentAccessVercelMiddlewareOptions {
  policy?: AgentAccessPolicy | unknown;
  policyPath?: string;
  policyUrl?: string;
  protectedPaths?: string[];
  failMode?: "open" | "closed";
  mode?: "policy" | "passport-required";
  humanFallback?: "allow" | "enforce";
  receipts?: ReceiptLedgerOptions;
  receiptSink?: (receipt: ReceiptRecord, request: VercelLikeRequest) => void | Promise<void>;
  next?: () => Response;
}

export type AgentAccessVercelMiddleware = (request: VercelLikeRequest) => Response | Promise<Response>;

export function createAgentAccessVercelMiddleware(options: AgentAccessVercelMiddlewareOptions): AgentAccessVercelMiddleware {
  let cached: { policy: AgentAccessPolicy; policyHash: string } | undefined;

  async function loadPolicy() {
    if (!cached) {
      const policy = options.policy
        ? validateAgentAccessPolicy(options.policy)
        : await readPolicyFile(requirePolicyPath(options.policyPath));
      cached = { policy, policyHash: hashPolicy(policy) };
    }
    return cached;
  }

  return async (request: VercelLikeRequest) => {
    let loaded: { policy: AgentAccessPolicy; policyHash: string };
    try {
      loaded = await loadPolicy();
    } catch (error) {
      if (options.failMode === "open") return nextResponse(options);
      return jsonResponse({ error: "agent_access_policy_unavailable", message: (error as Error).message }, 503);
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/.well-known/agent-access.json") {
      return jsonResponse(loaded.policy, 200, { "Cache-Control": "public, max-age=300" });
    }

    if (!isProtectedPath(requestUrl.pathname, options.protectedPaths)) {
      return nextResponse(options);
    }

    if (options.humanFallback === "allow" && !looksLikeAgentRequest(request)) {
      const response = nextResponse(options);
      response.headers.set("AA-Decision", "human_fallback");
      response.headers.set("AA-Policy-Ref", policyReference(requestUrl, options.policyUrl, "human"));
      return response;
    }

    const result = enforceAgentAccess(loaded.policy, loaded.policyHash, {
      url: request.url,
      method: request.method,
      headers: request.headers
    }, { policyUrl: options.policyUrl ?? `${requestUrl.origin}/.well-known/agent-access.json` });

    if (options.receipts || options.receiptSink) {
      const receipt: ReceiptRecord = {
        receiptVersion: "0.1",
        receiptType: "agent_access",
        receiptId: result.receiptId,
        timestamp: new Date().toISOString(),
        ...result.receipt
      };
      if (options.receipts) await appendReceipt(options.receipts.path, receipt);
      if (options.receiptSink) await options.receiptSink(receipt, request);
    }

    if (result.proceed) {
      const response = nextResponse(options);
      result.headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }

    return jsonResponse(result.body, result.status ?? 403, result.headers);
  };
}

export function createAgentAccessStaticPolicyCopy(policy: AgentAccessPolicy | unknown) {
  return JSON.stringify(validateAgentAccessPolicy(policy), null, 2);
}

function requirePolicyPath(policyPath: string | undefined) {
  if (!policyPath) throw new Error("policy or policyPath is required");
  return policyPath;
}

function nextResponse(options: AgentAccessVercelMiddlewareOptions) {
  return options.next?.() ?? new Response(null, {
    status: 200,
    headers: { "x-middleware-next": "1" }
  });
}

function jsonResponse(body: unknown, status: number, headers?: HeadersInit) {
  const response = Response.json(body, { status, headers });
  response.headers.set("Content-Type", "application/json");
  return response;
}

function isProtectedPath(pathname: string, protectedPaths: string[] | undefined) {
  if (!protectedPaths?.length) return true;
  return protectedPaths.some((pattern) => pathPatternMatches(pattern, pathname));
}

function pathPatternMatches(pattern: string, pathname: string) {
  if (pattern === pathname) return true;
  if (pattern.endsWith("/:path*")) {
    const base = pattern.slice(0, -"/:path*".length);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  if (pattern.endsWith("/**")) {
    const base = pattern.slice(0, -"/**".length);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  if (pattern.endsWith("*")) {
    return pathname.startsWith(pattern.slice(0, -1));
  }
  return false;
}

function looksLikeAgentRequest(request: VercelLikeRequest) {
  if (request.headers.get("AA-Agent-ID") || request.headers.get("AA-Purpose") || request.headers.get("AA-Use")) return true;
  const accept = request.headers.get("accept") ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  if (/\b(bot|crawler|spider|agent|scraper|http-client|python-requests|curl|wget)\b/i.test(userAgent)) return true;
  if (!accept.includes("text/html")) return true;
  return false;
}

function policyReference(requestUrl: URL, policyUrl: string | undefined, ruleId: string) {
  return `${policyUrl ?? `${requestUrl.origin}/.well-known/agent-access.json`}#${ruleId}`;
}
