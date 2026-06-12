# ADR 0001: Well-Known Policy Discovery

## Status

Accepted.

## Context

Agents need a predictable way to discover resource owner policy before access.

## Decision

Open Agent Access policies are discovered at:

```text
/.well-known/agent-access.json
```

## Consequences

This aligns with existing web discovery conventions and keeps policy independent
from any specific agent runtime, crawler, or payment provider.
