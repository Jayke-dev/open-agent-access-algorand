# ADR 0003: Payment Disabled By Default

## Status

Accepted.

## Context

Agent payments are high-impact operations. Accidental payment attempts are a
serious developer trust failure.

## Decision

The CLI and SDK do not pay unless payment is explicitly enabled and the caller's
declared budget allows the policy price.

## Consequences

Developers can safely inspect paid routes and receive 402 metadata without
setting signing credentials or risking spend.
