# @kirkelabs/open-agent-access-vercel

Vercel and Next.js middleware adapter for Open Agent Access.

Use this package when a static-first publisher, portfolio, docs site, or content
site wants to publish an `/.well-known/agent-access.json` policy and enforce
agent-specific rules at the edge.

## Install

```bash
npm install @kirkelabs/open-agent-access-vercel
```

## Next.js middleware

For Edge middleware, prefer importing the policy JSON at build time. Avoid
filesystem policy reads in Edge runtime.

```ts
// middleware.ts
import policy from "./agent-access.json";
import { createAgentAccessVercelMiddleware } from "@kirkelabs/open-agent-access-vercel";

export default createAgentAccessVercelMiddleware({
  policy,
  protectedPaths: ["/essays/:path*"],
  humanFallback: "allow",
  mode: "passport-required"
});

export const config = {
  matcher: ["/essays/:path*", "/.well-known/agent-access.json"]
};
```

With `humanFallback: "allow"`, normal browser requests for HTML continue to the
site. Agent-like requests are evaluated against the policy and receive
deterministic `AA-*` headers and JSON denials/review decisions when they do not
meet the declared requirements.

## Static policy copy

Keep `agent-access.json` as the source of truth and copy it to:

```text
public/.well-known/agent-access.json
```

or serve it through middleware by including `/.well-known/agent-access.json` in
the matcher.

## Serverless or local mode

For non-Edge usage you may load a policy from disk:

```ts
import { createAgentAccessVercelMiddleware } from "@kirkelabs/open-agent-access-vercel";

export default createAgentAccessVercelMiddleware({
  policyPath: "./agent-access.json",
  protectedPaths: ["/essays/:path*"],
  failMode: "closed"
});
```

## Receipts

Edge middleware should use `receiptSink` and write to a durable service.

```ts
createAgentAccessVercelMiddleware({
  policy,
  protectedPaths: ["/essays/:path*"],
  async receiptSink(receipt) {
    await fetch(process.env.OAA_RECEIPT_ENDPOINT!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(receipt)
    });
  }
});
```

Filesystem JSONL receipts are intended for local/serverless Node contexts, not
Edge runtime.
