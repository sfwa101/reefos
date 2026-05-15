# REEFOS — Architecture Laws · **v3.0**

> Subordinate to `SYSTEM_CONSTITUTION.md` and `SOVEREIGN_V3_MANDATE.md`. Defines the **hard architectural laws** every module, file, and contributor MUST obey. Under V3, Laws 2, 3, 6, and 9 are **blocking** (CI failure / revert on sight).

---

## V3 Core Laws (Imperial Override — read first)

- **Sovereign Singularity** — exactly ONE canonical implementation per concern (Cart, Pricing, Auth, Ledger, Inventory, Shift, KDS, Identity, Catalog). All others are `@deprecated` on sight, destroyed within the wave.
- **Gateway Exclusivity** — zero data-plane calls outside `src/core/<domain>/gateway/`. Any `supabase.*`, raw `fetch` to an external API, or third-party SDK call elsewhere is a blocking violation.
- **Presentation Purity (V3)** — UI is a pure Runtime Renderer. No arithmetic, no role-string branching, no direct gateway calls, no untyped state mutation.
- **Event-Driven Truth** — every state change is the projection of a registered immutable event in `src/core/events/catalog.ts`. Imperative side-effects bypassing the event bus are forbidden.

These map onto the numbered laws below — they do not replace them, they raise their severity.

---

## Law 1 — Layer Direction is One-Way

Dependencies flow **inward**: `apps → presentation → domain → kernel → data plane`. Reverse imports are forbidden.

- ❌ `src/core/*` importing from `src/pages/*`, `src/apps/*`, or any UI route.
- ❌ A domain module importing from a sibling domain module.
- ✅ Cross-domain communication happens via **events** or **gateway facades**.

## Law 2 — Gateways are the Only Door to Data

Every read/write to Supabase, edge functions, external APIs, or third-party SDKs goes through a **named gateway** (`catalogGateway`, `identityGateway`, `financeGateway`, …) located in `src/core/<domain>/gateway/`.

- ❌ `import { supabase } from "@/integrations/supabase/client"` inside any file under `src/components/**`, `src/pages/**`, `src/routes/**`, `src/modules/**/components/**`, or `src/apps/**`.
- ✅ UI imports a hook → hook imports a service → service imports a gateway → gateway is the only thing that touches Supabase.

## Law 3 — Presentation is Pure

UI components consume **ViewModels** (`*VM`) and **render descriptors** only.

- ❌ Pricing math, discount evaluation, eligibility branching, tax computation in components.
- ❌ Conditional rendering on raw role strings; use `<CapabilityGuard cap="..." />`.
- ✅ Components receive typed VMs and emit typed intents (events, server-fn calls).

## Law 4 — Schema Before Execution

No descriptor — SDUI tree, AI output, webhook payload, runtime layout — reaches a renderer or a writer without passing a registered Zod schema.

See `RUNTIME_SCHEMA_SPEC.md`.

## Law 5 — Capability Over Role

All authorization decisions resolve to a capability key from `CapabilityRegistry`. Roles exist only as **bundles of capabilities** in the database. Code never inspects the role name.

See `CAPABILITY_SYSTEM.md`.

## Law 6 — Events are the Only Truth of Change

Every state change worth remembering produces a **typed event** appended to the event log. Read models are projections, not the truth.

See `EVENT_SYSTEM.md`.

## Law 7 — Tenant Identity is Server-Sovereign

The frontend MAY display the active tenant. It MAY NOT assert it. Server functions resolve tenancy from the authenticated session and the `workspace_members` projection.

## Law 8 — Kernel Hosts Mechanism, Not Policy

Anything that varies per tenant, per section, per role, per locale, or per experiment lives in a **registry or descriptor**, not in kernel code branches.

See `KERNEL_MINIMALISM.md`.

## Law 9 — Single Source of Truth per Concern

| Concern | Authoritative source |
|---|---|
| Price | `pricingEngine` |
| Capability set | `CapabilityRegistry` + DB role-capability projection |
| Section identity | `sectionRegistry` |
| Tenant membership | `workspace_members` (server) |
| Catalog read | `catalogGateway` |
| AI invocation | `ai_gateway` |

Duplicating any of the above is a constitutional violation.

## Law 10 — No Hidden I/O at Module Top-Level

Side-effectful imports (network, storage, time-dependent randomness) are forbidden at module scope. They MUST live inside functions invoked under explicit lifecycle (handler, hook, effect).

## Law 11 — TypeScript is Strict; `any` is Banned

`tsc --noEmit` MUST pass. New code MUST NOT introduce `any` or unchecked `as` casts. Use `unknown` + Zod / type guards.

## Law 12 — File Layering Header

Every new file under `src/core/**`, `src/modules/**`, `src/apps/**` SHOULD declare its layer in a top-of-file comment, e.g.:

```ts
/** @layer kernel/runtime-ui · pure mechanism · no domain logic */
```

## Law 13 — Backward Compatibility for Public Registries

Adding to a registry (capabilities, blocks, events, sections) is allowed. Removing or renaming requires an ADR + migration.

## Law 14 — No Business Logic in `useEffect`

Effects synchronize; they do not decide. Business decisions live in services or server functions.

## Law 15 — Errors are Observable

Catches without an emitted log/trace/event are forbidden. Silent fallbacks are allowed only if the fallback is explicit, named, and traced.

---

## Allowed vs Disallowed — Examples

**Disallowed**

```tsx
// ❌ presentation talking to data plane and computing business logic
const { data } = await supabase.from("products").select("*");
const final = data.price * (user.role === "vip" ? 0.9 : 1);
```

**Allowed**

```tsx
// ✅ presentation consumes a VM produced by domain pipeline
const { data: vms } = useSectionFeed({ section: "meat" });
return <RuntimeRenderer descriptor={resolveListTree("meat", vms)} />;
```

---

*These laws are enforceable by review, lint boundaries, and runtime guards. They are not suggestions.*
