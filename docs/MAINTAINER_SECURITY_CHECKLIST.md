# Maintainer Security Checklist

Use this before releases and before accepting payment-path changes.

- `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm security:check` pass.
- No `.env`, mnemonic, private key, seed phrase, or production wallet is present.
- Payment remains opt-in for CLI and SDK examples.
- Budget checks happen before any payment attempt.
- 402 metadata binds method, URL, policy hash, rule ID, and trace ID.
- Paid fulfilment has replay protection and idempotency semantics.
- Rate limiting happens before expensive site work.
- Receipt verification detects malformed JSON, hash mismatches, and chain breaks.
- Docs clearly separate local TestNet mnemonic loading from production signing.
