# Compliance Mappings

Open Agent Access includes implementation-oriented control mappings for common
enterprise review frameworks:

- NIST AI RMF
- EU AI Act / GPAI-style transparency and documentation themes
- SOC 2
- ISO 27001
- NIS2-style operational resilience themes

These mappings are not legal advice, certification, or a substitute for counsel
or auditor review. They help teams connect OAA technical artifacts to evidence
requests.

## CLI

```sh
pnpm oaa compliance map --framework all --json
pnpm oaa compliance map --framework nist-ai-rmf
pnpm oaa compliance map --framework eu-ai-act
```

Each mapping includes:

- framework
- control area
- requirement theme
- OAA controls
- evidence artifacts
- notes

## Evidence Artifacts

Common evidence artifacts include:

- `agent-access.json`
- `agent-mandates.json`
- signed agent identity headers
- receipts and receipt hashes
- event trails
- immutable evidence bundles
- OPA/Rego or Cedar-style exports
- trust passports
- SIEM/OpenTelemetry audit exports
