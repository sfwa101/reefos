# Runtime Model

## Components

| Component | Role |
|---|---|
| **Kernel** | Registries (blocks, capabilities, sections), renderers, event bus primitives. |
| **Gateways** | Single ingress per domain; enforce capability + policy; emit events. |
| **Runtimes** | Domain invariants; pure where possible; tested in isolation. |
| **Projections** | Denormalized read models, rebuildable from the event log. |
| **Audit** | Immutable financial/sovereign trail. |
| **AI Gateway** | Single ingress to model providers; governance pipeline. |

## Request lifecycle

1. UI dispatches intent via typed server fn.
2. Middleware attaches Supabase auth + trace id.
3. Gateway: capability check → input schema → invariant check.
4. Runtime mutates via RPC or RLS-scoped Supabase call.
5. Event emitted; subscribers fan out.
6. Projection updated; audit row written if applicable.
7. Response returned with structured outcome.

## Failure model

- Validation failure → typed error, no state change.
- Capability denial → audit `cap.denied`, generic UI message.
- Provider error → trace + retry per policy → graceful fallback.
- Invariant violation → fail closed, never compensate silently.
