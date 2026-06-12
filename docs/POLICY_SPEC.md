# Policy Spec

Policies live at:

```text
/.well-known/agent-access.json
```

Required top-level fields are `version`, `protocol`, `site`, and `rules`.

Rules match HTTP methods and path globs, then return one of:

- allow
- deny
- charge
- throttle
- review
- redirect_to_api
- human_only

Policies can declare attribution, retention, training, summarisation, indexing,
quote limits, rate limits, load preferences, emergency stops, paid access, x402
payment requirements, Algorand network/pay-to/asset/facilitator metadata, policy
expiry, jurisdiction, and review paths.

See `schema/agent-access.schema.json` for the normative v0.1 JSON Schema.
