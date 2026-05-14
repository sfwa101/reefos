# REEFOS — Runtime Schema Specification

> Subordinate to `SYSTEM_CONSTITUTION.md`.
> Governs every payload that is composed, transmitted, validated, or rendered at runtime: SDUI descriptors, ViewModels, AI outputs, event payloads, gateway responses.

> **Cross-reference — Chapter 17 (Zero Trust Identity, [`ZERO_TRUST_IDENTITY.md`](./ZERO_TRUST_IDENTITY.md)):** every schema validator that touches workspace-scoped data **MUST** treat `workspaceId` as a server-attested value sourced exclusively from the JWT claim via `requireWorkspace` middleware. Validators **MUST NOT** accept `workspaceId` (or any equivalent tenant identifier) as a client-supplied input field — if such a field appears in an incoming payload, the validator must reject it. Schemas describing persisted rows MAY include a `workspace_id` column for storage shape, but the runtime value is always overwritten by `context.workspaceId` at the gateway boundary.

---

## 1. Core Doctrine

> **Nothing executes, renders, or persists without passing a registered schema validator.**

A descriptor without a schema is a **rumor**. Rumors do not run.

---

## 2. Schema Sources of Truth

| Payload kind | Schema location | Validator |
|---|---|---|
| SDUI descriptor tree | `src/core/runtime-ui/types.ts` + `src/core-os/sdui-engine/engine/schemas.ts` | Zod, registered in `BlockRegistry` |
| Catalog VMs | `src/core/catalog/types.ts` (Zod mirrors required) | `ProductHydrationPipeline` |
| Events | `src/core/events/catalog.ts` (per `EVENT_SYSTEM.md`) | Event bus dispatcher |
| AI outputs | `src/core-os/sdui-engine/engine/sanitizeAiBlocks.ts` + per-advisor schemas | `ai_gateway` post-processor |
| Gateway responses | per-gateway Zod parser | gateway boundary |

---

## 3. Render Descriptor Tree

```ts
interface RenderBlock {
  kind: string;            // MUST be registered in blockRegistry
  id: string;              // unique within tree
  props?: Readonly<Record<string, unknown>>;  // schema-validated by block
  children?: RenderBlock[];
}
interface RenderDescriptor {
  context: Readonly<Record<string, unknown>>;
  blocks: RenderBlock[];
}
```

Rules:

1. `kind` MUST resolve in `blockRegistry`. Unknown kinds → `MissingBlock` in dev, silent skip + trace in prod.
2. `props` MUST be validated by the block's own Zod schema before render.
3. Trees are **immutable** once produced. Renderers may not mutate.
4. Trees are **side-effect free** to construct — no I/O during composition.
5. Depth is bounded; the renderer enforces a max depth (default 16) to prevent runaway recursion.

## 4. ViewModels

- Suffix `*VM` (e.g. `ProductCardVM`).
- Produced exclusively by the domain's `ViewModelFactory`.
- Plain serializable objects — no functions, no class instances, no Date objects (use ISO strings).
- Versioned: every VM type carries a `__v` integer when persisted or transmitted.

## 5. AI Output Validation

- AI gateways return **candidates**, not commands.
- Each candidate MUST pass:
  1. Static schema validation (Zod).
  2. `sanitizeAiBlocks` allow-list filter.
  3. Capability gate (caller MUST hold the capability the candidate requires).
  4. Sovereignty policy (see `AI_GOVERNANCE.md`).

A candidate failing any step is dropped and traced; it never reaches the renderer.

## 6. Versioning

- Schema additions: backward compatible — allowed.
- Schema removals/renames: require ADR + version bump + migration of stored layouts/events.
- Stored SDUI layouts MUST carry `schema_version`. Loaders MUST refuse layouts whose version exceeds the runtime's max.

## 7. Forbidden Patterns

- ❌ Rendering raw JSON from DB or AI without schema validation.
- ❌ `dangerouslySetInnerHTML` driven by runtime descriptors.
- ❌ Inferring block behavior from string heuristics (`if (kind.includes("hero"))`).
- ❌ Allowing UI to construct block trees ad-hoc; trees come from `resolveRenderTree*` resolvers.
- ❌ Mutating a descriptor tree post-validation.

## 8. Allowed Pattern (canonical)

```ts
const tree = resolveListTree(sectionSlug, vms);     // pure
const safe = renderSchema.parse(tree);              // validated
return <RuntimeRenderer descriptor={safe} />;       // rendered
```

## 9. Watchdog

`SduiWatchdog` MUST observe rendered trees in development and report:

- unknown `kind` values
- props failing block schemas
- excessive depth or fan-out
- repeated render thrash

In production, the watchdog reports to observability without throwing.

---

*A runtime that renders unvalidated descriptors is not a runtime — it is a vulnerability.*
