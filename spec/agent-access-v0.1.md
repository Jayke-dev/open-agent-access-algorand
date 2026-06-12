# Open Agent Access Policy v0.1

Open Agent Access defines a machine-readable handshake for agent access to sites,
APIs, tools, and paid content.

The discovery location is:

```text
/.well-known/agent-access.json
```

The policy declares default handling and route rules for agent identity, purpose,
use, retention, attribution, load, rate limits, optional paid access, and receipt
requirements. Decisions are `allow`, `deny`, `charge`, `throttle`, `review`,
`redirect_to_api`, or `human_only`.

This repository treats the schema in `schema/agent-access.schema.json` as the
normative v0.1 machine-readable contract.
