# Architecture

Open Agent Access has four layers:

1. Policy discovery at `/.well-known/agent-access.json`.
2. Agent preflight for identity, purpose, use, budget, and local receipts.
3. Site middleware for policy enforcement, rate/load controls, 402 metadata, and site receipts.
4. Optional payment adapters, starting with Algorand x402 TestNet.

The core package owns schema validation, matching, decisions, headers, budgets,
hashing, and receipts. Framework packages consume core decisions. Payment
packages are optional and must never be required for tests or free access.

Security-sensitive defaults:

- policies and individual rules can expire
- receipt appends are lock-protected and append-only
- middleware rate limits before route work
- paid route fulfilment uses replay checks and in-memory idempotency locks
- 402 responses include a resource binding hash derived from method, URL, policy
  hash, rule ID, and trace ID
- payment libraries are dynamically loaded only when payment is explicitly enabled
