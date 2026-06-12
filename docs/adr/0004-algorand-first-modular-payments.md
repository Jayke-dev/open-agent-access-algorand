# ADR 0004: Algorand-First Modular Payments

## Status

Accepted.

## Context

Algorand is well suited to high-frequency, low-value agentic payments, but Open
Agent Access should not be locked to a single settlement network forever.

## Decision

Algorand x402 is first-class in v0.1 and isolated behind a payment adapter
package.

## Consequences

The protocol remains useful without payment setup, and future payment adapters
can be added without changing policy discovery, decisions, headers, or receipts.
