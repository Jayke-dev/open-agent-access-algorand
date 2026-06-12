# Receipts

Receipts are JSONL records with SHA-256 hash chaining. They are local,
tamper-evident logs for agent and site decisions.

Each receipt binds:

- method and URL
- origin
- agent identity
- declared purpose, use, and budget
- policy URL, rule ID, policy hash, and decision
- rate metadata
- payment metadata
- response metadata
- previous receipt hash
- current receipt hash

Commands:

```sh
pnpm oaa receipts verify .oaa/receipts.jsonl
pnpm oaa receipts digest .oaa/receipts.jsonl
pnpm oaa receipts tail .oaa/receipts.jsonl
pnpm oaa receipts inspect .oaa/receipts.jsonl --trace-id TRACE
pnpm oaa receipts reconcile .oaa/receipts.jsonl .oaa/site-receipts.jsonl
pnpm oaa receipts keygen
pnpm oaa receipts sign .oaa/receipts.jsonl .oaa/signed-receipts.jsonl --private-key .oaa/receipt-private.pem
pnpm oaa receipts verify-signatures .oaa/signed-receipts.jsonl --public-key .oaa/receipt-public.pem
```

The local writer uses a lock file next to the ledger and appends one canonical
JSON object per line. Verification reports malformed JSON lines, previous-hash
mismatches, and receipt-hash mismatches.

Reconciliation compares agent and site ledgers by trace ID and checks method,
URL, origin, rule ID, policy hash, decision, and payment metadata. It is intended
for support, dispute resolution, and publisher/agent integration testing.
