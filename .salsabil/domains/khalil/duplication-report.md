# Khalil — Duplication Report

Khalil must NOT reinvent anything the Salsabil kernel already provides.
This file is the canonical list of "use the kernel, do not rebuild".

## Kernel surfaces Khalil MUST consume

| Concern | Kernel provider | Notes |
|---|---|---|
| Auth session | `@/context/AuthContext` (client) / `requireSupabaseAuth` (server) | Khalil never re-implements sign-in. |
| Workspace identity | `requireWorkspace` middleware + `getWorkspaceIdSync()` | Server-attested only. Never read `window.location` or env for identity. |
| Capabilities | `@/core/capabilities/*` + `useCapability` | All Khalil gates go through the central registry. |
| Event bus | `@/core/events/*` | Khalil emits and consumes here, not via custom bus. |
| Theme | `@/core/theme/*` | Khalil layers tokens, does not fork the runtime. |
| i18n | shared i18n runtime | Khalil catalogs are namespaced `khalil.*`. |
| UI primitives | `@/components/ui/*` | Buttons, sheets, dialogs, etc. |
| SDUI | `@/core/runtime-ui/*` | Dashboards = descriptors + blocks, not bespoke pages. |
| Audit | shared audit emitter | Sensitivity ≥ financial automatically logged. |
| AI gateway | Salsabil AI gateway (`LOVABLE_API_KEY` inside server fn handler) | Never instantiate a new model client. |

## Concerns Khalil DOES own (and must not leak elsewhere)

- Identity level mechanics (archetypes, transitions).
- Pillar definitions (prayer, habit, workout, weight, mood, recovery).
- Daily orchestrator policy.
- Coach prompt catalogs.
- Khalil-specific analytics rollups.
- Khalil-specific theme tokens (`khalil.*`).
- Khalil onboarding ritual.

## Known historical duplication risks

| Risk | Mitigation |
|---|---|
| A second auth flow inside Khalil onboarding | Onboarding is a **post-auth** ritual. Khalil never replaces Salsabil sign-in. |
| A separate "Khalil profile" table | Use the canonical profile + a `khalil_user_context` row for domain-private state. |
| A second event bus | Use the shared bus with `khalil.*` namespace. |
| A second i18n loader | Use the shared loader, register a `khalil` catalog. |
| A "Khalil sidebar" copy of `AdminShell` | Khalil has its own shell — but it composes shared blocks. It does not fork `AdminShell`. |

## Discovery checklist (run before adding any new file)

1. Does `@/core/*` already export this concern?
2. Does `@/components/ui/*` already cover this primitive?
3. Does a sibling domain already implement a similar runtime (and should I
   propose extracting it to the kernel instead)?
4. If you are about to copy code from outside `@/core/khalil/*` into Khalil,
   **stop** and open an ADR.
