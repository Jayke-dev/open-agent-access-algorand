# ADR 0002: Local JSONL Receipts First

## Status

Accepted.

## Context

Agents and sites need low-friction auditability before introducing global
anchoring or mandatory signing.

## Decision

v0.1 uses local JSONL receipts with SHA-256 hash chaining.

## Consequences

Receipts are easy to inspect, append, reconcile, and test. They are
tamper-evident locally, not globally notarized. Signed receipts and optional
anchoring can build on the same record shape.
