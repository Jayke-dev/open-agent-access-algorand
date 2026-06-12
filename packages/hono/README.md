# @open-agent-access/hono

Hono middleware for Open Agent Access policy enforcement.

Includes:

- policy loading and validation
- agent access header inspection
- deterministic decision headers
- rate limiting before route work
- JSONL site receipts
- 402 payment metadata
- replay-store hook for paid routes
- in-memory replay store for development

```ts
import { Hono } from "hono";
import { agentAccessMiddleware } from "@open-agent-access/hono";

const app = new Hono();

app.use("*", agentAccessMiddleware({
  policyPath: "./agent-access.json",
  receipts: { type: "jsonl", path: ".oaa/site-receipts.jsonl" }
}));
```

Use `@open-agent-access/storage-redis` or
`@open-agent-access/storage-postgres` for production replay protection.
