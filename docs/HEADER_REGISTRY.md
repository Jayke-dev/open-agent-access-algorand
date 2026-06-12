# Header Registry

Open Agent Access uses `AA-*` HTTP headers for agent declarations and site
decisions.

## Agent Request Headers

| Header | Required | Example | Notes |
| --- | --- | --- | --- |
| `AA-Agent-ID` | yes | `did:web:agent.example#research-agent` | Stable agent identity. |
| `AA-Agent-Name` | no | `Research Agent` | Human-readable agent name. |
| `AA-Agent-Operator` | no | `Example Labs` | Organization operating the agent. |
| `AA-Agent-Principal` | no | `user:alice@example.com` | User or principal behind the request. Avoid unnecessary PII. |
| `AA-Agent-Contact` | no | `mailto:agents@example.com` | Contact for incidents or review. |
| `AA-Purpose` | yes | `research` | Declared purpose. |
| `AA-Use` | yes | `read` | Declared use of the resource. |
| `AA-Budget` | no | `USD:0.05` | Maximum caller budget for this request. |
| `AA-Trace-ID` | yes | UUID | Binds policy decision, payment, and receipt. |
| `AA-Respect-Policy` | yes | `true` | Explicit policy respect signal. |
| `AA-Protocol-Version` | yes | `0.1` | Protocol version. |
| `AA-Idempotency-Key` | paid routes | UUID | Recommended for paid fulfilment and replay safety. |

## Site Decision Headers

| Header | Required | Example | Notes |
| --- | --- | --- | --- |
| `AA-Decision` | yes | `allow` | `allow`, `deny`, `charge`, `throttle`, `review`, `redirect_to_api`, `human_only`. |
| `AA-Policy-Ref` | yes | `https://example.com/.well-known/agent-access.json#rule` | Policy and rule reference. |
| `AA-Policy-Hash` | recommended | SHA-256 hex | Binds response to policy contents. |
| `AA-Trace-ID` | yes | UUID | Echoes or creates request trace. |
| `AA-RateLimit-Limit` | when applicable | `60` | Limit for the matched rule. |
| `AA-RateLimit-Remaining` | when applicable | `59` | Remaining allowance. |
| `AA-Attribution-Required` | when applicable | `true` | Whether attribution is required. |
| `AA-Retention` | when applicable | `30d` | Retention rule summary. |
| `AA-Receipt-ID` | yes | `oaa_...` | Site receipt ID. |
| `AA-Payment-Resource` | paid routes | SHA-256 hex | Binding over method, URL, policy hash, rule ID, and trace ID. |

Security notes:

- Treat all agent-declared purpose/use fields as claims, not proof.
- Do not put private keys, mnemonics, session tokens, or unnecessary PII in
  headers.
- Paid route proofs should be bound to method, URL, policy hash, rule ID, and
  trace ID.
