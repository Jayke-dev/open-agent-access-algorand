# Threat Model

Threats:

- replay attacks
- cross-resource payment proof substitution
- unpaid service leakage
- paid-but-denied failures
- race conditions and duplicate fulfilment
- metadata privacy leakage
- excessive crawler load
- malicious agents lying about purpose
- malicious sites misrepresenting price
- receipt tampering
- secret leakage
- facilitator trust assumptions

Mitigations:

- bind receipts to method, URL, policy hash, and trace ID
- bind payment prompts to method, URL, policy hash, rule ID, and trace ID
- enforce budget ceilings before payment
- use replay cache before paid fulfilment
- support idempotency keys for paid fulfilment
- use pessimistic route locks for paid high-cost resources
- rate limit before expensive work
- never log secrets
- keep payment metadata PII-safe
- support dry-run mode
- keep payment disabled by default in CLI

v0.1 receipts are local and tamper-evident, not globally notarized. Signed
receipts and anchoring are roadmap items. The Hono adapter includes an in-memory
replay cache and route lock; production deployments should back these with a
shared datastore when running more than one process or region.
