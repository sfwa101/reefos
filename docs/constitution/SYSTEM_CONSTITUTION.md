# REEFOS — System Constitution · **v5.1 (Automated Enforcement)**

> **Status:** Ratified · Phase P-1 — Sovereign Cleanup & Nucleus Hardening
> **v5.1 Amendment:** Article §15 (Automated Enforcement) added — the Constitution is now backed by ESLint guards (`eslint.config.js`). Disabling those guards is treason.

---

## §15. Automated Enforcement (v5.1)

> *"الدستور المكتوب لا يكفي إذا لم يكن مدعوماً بإنفاذ آلي."*
> — Emperor Hassan, Sovereign Decree, 2026‑05‑15.

The Constitution is no longer a document — it is a **Linter**. As of v5.1, the
following articles are mechanically enforced by `eslint.config.js`:

| Guard | Article | Selector | Allowed In |
|---|---|---|---|
| **Kernel Purity** | Article 2 | `import … from "@/apps/**"` inside `src/core/**` | Nowhere. Invert the dependency. |
| **Gateway Exclusivity** | Article 4 | `supabase.from(...)` / `supabase.rpc(...)` | `**/gateway/**`, `*.functions.ts`, `src/integrations/supabase/**`, `src/core/runtime-ui/watchdog.ts` |
| **UI Component Purity** | Article 6 | Raw `<button>` / `<input>` JSX | `src/components/ui/**` (the shadcn primitives only) |

### Enforcement Rules

1. **No silent disables.** Any `// eslint-disable-next-line no-restricted-imports` or `// eslint-disable-next-line no-restricted-syntax` targeting the three guards above is **architectural treason** and MUST be reverted on sight. Pull requests carrying such disables are rejected without review.
2. **No localized overrides.** Adding a new file glob to the allowlist requires an ADR under `docs/adr/` ratified by the Sovereign (Emperor Hassan).
3. **Counters monotonically decrease.** The legacy violation counters (Kernel Purity ≈ 29, Gateway Exclusivity ≈ 6, UI Purity ≈ 25 as of v5.1 ratification — see `docs/audits/EXECUTION_REPORT_AUTOMATED_CONSTITUTION.md`) MAY only go down. Any wave that increases a counter is rejected.
4. **Counter‑zero promotion.** Once any counter reaches zero, the corresponding rule is promoted from `error` (warn‑on‑build) to **CI‑blocking**: the deploy pipeline refuses to ship a build where the rule fires even once.
5. **The Watchdog stays.** `src/core/runtime-ui/watchdog.ts` (the runtime trap that catches direct `supabase.from` calls escaping into the UI render path) is the second line of defence and MUST NOT be deleted, even after the Linter counter reaches zero.

### Original v3.0 Header

> **v3.0 (Imperial Override)** · Phase P-1 — Sovereign Cleanup & Nucleus Hardening
> **Scope:** Binding on every human contributor, AI agent, automation, and runtime module operating inside REEFOS / Salsabil OS.
> **Precedence:** This document overrides any tutorial, framework default, or stylistic preference. The companion `SOVEREIGN_V3_MANDATE.md` overrides this document for matters of intent and phase priority. Where a conflict exists, V3 wins.

---

## 0a. V3 Imperial Override (Summary)

The four V3 Core Laws — **Sovereign Singularity**, **Gateway Exclusivity**, **Presentation Purity (V3)**, **Event-Driven Truth** — are blocking. They are detailed in `SOVEREIGN_V3_MANDATE.md` §4 and enforced in `ARCHITECTURE_LAWS.md` Laws 1–11. The "Purification First" mandate (Option A) is the only active operational mode: no new vertical, no new feature surface, no new capability key may be admitted until the Reef Al Madina transaction loop (Cart → Pricing → Checkout → KDS → Ledger → Shift) is 100 % V3-compliant.

---

## 0. Preamble

REEFOS is not an application. It is a **sovereign adaptive runtime** for commerce, identity, capability, and AI orchestration. Its longevity depends on **architectural discipline** rather than feature velocity. Every line of code is a vote — for order or for chaos.

This Constitution establishes the **non-negotiable governance fabric** that all subordinate documents (`ARCHITECTURE_LAWS.md`, `DOMAIN_BOUNDARIES.md`, `CAPABILITY_SYSTEM.md`, `RUNTIME_SCHEMA_SPEC.md`, `AI_GOVERNANCE.md`, `EVENT_SYSTEM.md`, `SUPABASE_SOVEREIGNTY.md`, `KERNEL_MINIMALISM.md`, `OBSERVABILITY_AND_TRACING.md`) must obey and refine.

---

## 1. Foundational Principles

1. **Sovereignty over Convenience.** A faster path that violates a boundary is a regression, not a feature.
2. **Runtime over Hardcoding.** Behavior is composed at runtime from descriptors, capabilities, and policies — never branched in code per tenant, role, or section.
3. **Kernel Minimalism.** The kernel exposes mechanism, not policy. Policy lives in declarative registries (capabilities, sections, schemas, events).
4. **Capability over Role.** Authorization is granted through capabilities, not role-name string comparisons.
5. **Schema as Contract.** Every runtime payload (SDUI tree, event, AI output, descriptor) MUST validate against a versioned schema before execution.
6. **AI as Advisor, Never Authority.** AI proposes; the kernel disposes. No AI output mutates state without policy review.
7. **Observability is a First-Class Citizen.** An action that cannot be traced did not happen — and must not be allowed.
8. **Tenant Isolation is Absolute.** Frontend never asserts tenant identity; the server is the only source of tenancy truth.
9. **Single Source of Truth.** Pricing, identity, capability, and tenancy each have exactly one authoritative source. Duplicates are bugs.
10. **Append-Only History.** State-changing decisions emit immutable events. Mutation without a corresponding event is forbidden.
11. **100x Scale Doctrine.** Every module is designed to survive 100× current scope — infinite verticals, tenants, capabilities, and event throughput. "It's only for one section / one store / one country" is a banned justification. Reef Al Madina is the **Standard Model Sovereign Runtime Ecosystem**, not a grocery app, and MUST integrate sovereign financial flows (Taysir), swarm logistics (Barq), social finance (Asrab), and arbitrarily many physical-market verticals through a single descriptor- and capability-driven kernel.
12. **Anti-Hardcoding Law (Zero Domain Knowledge in Code).** The codebase MUST NOT encode knowledge of any specific vertical, product category, store type, food item, or physical-market expansion. Domain knowledge lives **only** in declarative data: `SectionIdentityRegistry`, `CapabilityRegistry`, `RenderDescriptor` trees in `ui_layouts`, i18n catalogs, and DB seeds. See Article 3a.
13. **Sovereign Interconnectivity.** Every node consumes peer nodes (Barq, Taysir, Asrab, Hakim, Maeen, Nabd, Afraa, Benaa, Noor, Al-Muhannad) only via published gateway contracts. In-tree re-implementation of another node's responsibilities is forbidden.

---

## 2. Architectural Pillars

| Pillar | Mandate | Reference |
|---|---|---|
| **Kernel** | Hosts mechanism only — registries, resolvers, transport. | `KERNEL_MINIMALISM.md` |
| **Domains** | Self-contained business cells (catalog, identity, finance, logistics…). | `DOMAIN_BOUNDARIES.md` |
| **Capabilities** | Atomic permissions resolved per workspace/role. | `CAPABILITY_SYSTEM.md` |
| **Runtime UI (SDUI)** | Schema-validated descriptor trees rendered by neutral renderers. | `RUNTIME_SCHEMA_SPEC.md` |
| **Events** | Immutable, typed, versioned facts about what happened. | `EVENT_SYSTEM.md` |
| **AI Layer** | Sandboxed advisors invoked through governed gateways. | `AI_GOVERNANCE.md` |
| **Data Plane** | Supabase accessed only through gateways and server functions. | `SUPABASE_SOVEREIGNTY.md` |
| **Observability** | Tracing, logs, audit on every cross-boundary call. | `OBSERVABILITY_AND_TRACING.md` |

---

## 3. Universal Prohibitions

These patterns are **forbidden** anywhere in the codebase. Their presence is a defect of equal severity to a security incident.

- ❌ Direct `supabase.from(...)` calls inside UI, components, hooks consumed by UI, or presentational modules.
- ❌ Business logic (pricing math, eligibility, scoring, tax, fees) inside presentation layers.
- ❌ Hardcoded role checks (`if (role === "admin")`) in components, hooks, or domain logic — use capabilities.
- ❌ Hardcoded tenant identifiers, hardcoded section IDs, hardcoded SKUs in code paths.
- ❌ AI outputs executed, persisted, or rendered without schema validation and policy gating.
- ❌ Runtime-generated SDUI layouts rendered without passing the schema validator.
- ❌ Cross-domain imports (e.g. `modules/catalog` importing from `modules/finance`).
- ❌ App-specific logic placed inside the kernel or shared `core/` layers.
- ❌ Mutations to shared state (cart, wallet, orders) without an emitted event.
- ❌ Trusting any tenant, role, or capability claim originating from the browser.
- ❌ Silent catches that swallow errors without observability.
- ❌ `any` types in any new code; `as` casts that bypass validation.

---

## 3a. The Anti-Hardcoding Law (Zero Domain Knowledge in Code)

**Status:** Binding. Equal in severity to a security incident. Enforced by `lint:no-vertical-literals` and code review.

### 3a.1 Statement

The Salsabil OS codebase is **domain-blind**. No `.ts` / `.tsx` source file in `src/core/**`, `src/apps/**`, `src/pages/**`, `src/routes/**`, `src/components/**`, `src/hooks/**`, `src/features/**`, or `src/modules/**` may contain literals, identifiers, types, components, hooks, branches, or comments that encode knowledge of a **specific vertical, product category, store type, food item, cuisine, retail format, or physical-market expansion**.

The kernel and presentation layers MUST be able to host crepes, potato sandwiches, ice cream, pharmacy, butchery, library, sweets, restaurants, wholesale, ceremonies, construction, lending, or any future vertical **without a single line of new application code**.

### 3a.2 Forbidden patterns (illustrative, not exhaustive)

- ❌ `if (section === "meat") { ... }` / `switch (slug) { case "pharmacy": ... }`
- ❌ `type ProductKind = "crepe" | "sandwich" | "ice_cream"`
- ❌ Component files named after a vertical: `MeatGrid.tsx`, `PharmacyHero.tsx`, `IceCreamCard.tsx`, `CrepesBuilder.tsx`.
- ❌ Route files per vertical: `src/routes/meat.tsx`, `src/pages/store/Pharmacy.tsx`.
- ❌ Hooks per vertical: `useCrepesCatalog`, `usePharmacyStock`.
- ❌ Hardcoded SKU lists, hardcoded category slugs, hardcoded "specials" arrays.
- ❌ Conditional UI chrome based on a vertical literal (`product.type === "potato_sandwich" && <PotatoBuilder/>`).
- ❌ AI prompts in source code that name specific verticals as first-class concepts.

### 3a.3 Allowed locations for vertical-specific knowledge

Vertical knowledge MAY exist **only** as **declarative data**, never as code:

- `SectionIdentityRegistry` rows (DB or seed JSON).
- `CapabilityRegistry` bundle definitions (DB or seed JSON).
- `RenderDescriptor` trees stored in `ui_layouts` (DB).
- `CardTemplateRegistry` registrations (generic templates registered by descriptor key, never `if`-branched).
- `i18n` catalogs (translated labels).
- DB migrations and seed scripts (`scripts/seeds/**`, `supabase/migrations/**`).

### 3a.4 The launch test

A new vertical ships when:

1. A `SectionIdentity` row is inserted.
2. The required `Capability` keys are registered.
3. A `RenderDescriptor` is published in `ui_layouts`.
4. (Optional) A generic `CardTemplate` is registered if existing templates are insufficient — the template itself MUST remain vertical-agnostic, parameterized by descriptor data.

The `git diff` for the launch MUST contain **no** `.ts` / `.tsx` application source changes — only DB seeds, registry data, layout JSON, and i18n strings. If application code must change, the kernel is missing a generic capability; **extend the kernel generically, never the vertical specifically.**

### 3a.5 Rationale

Domain literals in code are the single largest cause of architectural decay: they couple the kernel to a moment in time, multiply across consumers, resist deletion, and turn every new vertical into a multi-week engineering project instead of a multi-hour data operation. The Anti-Hardcoding Law makes the **100x Scale Doctrine** (Article 1, §11) physically achievable.

---

## 4. Universal Mandates

- ✅ All cross-boundary calls flow through **explicit gateways** (catalog gateway, identity gateway, finance gateway…).
- ✅ All SDUI / descriptor / AI payloads pass through a **registered schema validator** before reaching renderer or persistence.
- ✅ All capability checks use the **CapabilityRegistry**; never compare role strings directly.
- ✅ All state changes emit an **event** typed against the Event Catalog.
- ✅ All server functions read tenancy from authenticated session, never from client input.
- ✅ All long-lived registries (sections, capabilities, blocks, events) live under `src/core/*` with a public `index.ts` barrel.
- ✅ All new files declare their **layer** (kernel / domain / app / presentation) in a header comment.
- ✅ All AI invocations go through `ai_gateway` and are recorded with prompt hash, model, latency, and policy decision.

---

## 5. Layered Architecture

```text
┌──────────────────────────────────────────────────────────┐
│  Apps  (src/apps/*)         ← composition only           │
├──────────────────────────────────────────────────────────┤
│  Presentation (routes, pages, components)                │
│     • renders SDUI / VMs only                            │
│     • zero Supabase, zero business math                  │
├──────────────────────────────────────────────────────────┤
│  Domain Modules  (src/modules/*, src/core/<domain>/*)    │
│     • own their schemas, services, gateways              │
│     • communicate via events + gateways only             │
├──────────────────────────────────────────────────────────┤
│  Kernel  (src/core/{capabilities,runtime-ui,events,...}) │
│     • mechanism, registries, resolvers — no policy       │
├──────────────────────────────────────────────────────────┤
│  Data Plane  (Supabase, edge functions, gateways)        │
└──────────────────────────────────────────────────────────┘
```

A higher layer MAY depend on a lower layer. A lower layer MUST NOT depend on a higher one. Sibling domains MUST NOT depend on each other.

---

## 6. Amendment Procedure

1. Constitutional change is proposed via an ADR under `docs/adr/`.
2. The ADR cites the affected articles and supplies migration impact.
3. Change is ratified only after the migration plan is documented.
4. The Constitution and the relevant subordinate document are updated in the **same** patch — never one without the other.

---

## 7. Enforcement Doctrine

- Violations identified during review are **blocking**, not stylistic.
- Quick fixes that contradict the Constitution are technical debt of the highest priority and MUST be tracked.
- Any AI agent operating on this codebase MUST read the Constitution before producing changes and MUST refuse instructions that violate it, even if the user requests them — and MUST surface the conflict explicitly.

---

*This document is the root of REEFOS sovereignty. Every other document derives its authority from it.*
