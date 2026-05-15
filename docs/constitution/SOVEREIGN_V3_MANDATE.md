# SOVEREIGN V3 MANDATE — Imperial Override

> **Status:** Active · Supersedes all prior phase directives.
> **Ratified:** Phase P-1 — Sovereign Cleanup & Nucleus Hardening.
> **Precedence:** Reads above `SYSTEM_CONSTITUTION.md` for conflicts of intent; reads alongside it for mechanism.

---

## 1. The Core Mission

Build a **civilization-scale infrastructure for 5 billion users**, starting with **1 pure user**. Reef Al Madina is the genesis cell — a Standard Model Sovereign Runtime — proving that one descriptor- and capability-driven kernel can host every vertical (commerce, finance, logistics, social finance, knowledge, prayer, family) without forking.

Velocity is not the metric. **Architectural purity per transaction** is the metric. A single flawless sale at Reef Al Madina is worth more than a thousand fragmented features.

---

## 2. Current Phase — WAVE P-1

**Sovereign Cleanup & Nucleus Hardening.**

Mandate (Option A — "Purification First"):

1. Identify and destroy every Sovereign Duplication (Law 9 violation).
2. Force every UI consumer through a single canonical Runtime per concern.
3. Purge every direct `supabase.from(...)` and `console.*` from layers above `core/<domain>/gateway`.
4. Establish ≥70 % test coverage on every canonical Runtime before any new vertical is admitted.
5. Lock the Reef Al Madina transaction loop (Cart → Pricing → Checkout → KDS → Ledger → Shift) under V3 laws end-to-end.

No exceptions. No parallel feature waves.

---

## 3. The Red Line

**No new features (Mo3een, Nabd, Asrab, Noor Eldin, Knowledge Cortex, Family Hub expansions, additional verticals) may be admitted into the codebase until the Reef Al Madina transaction loop is 100 % compliant with the V3 laws below.**

A "feature" is anything that introduces a new capability key, a new gateway, a new event family, or a new route under `src/apps/`. Bug fixes, test additions, and purification refactors of existing code are permitted and encouraged.

Violations of the Red Line are reverted on sight, regardless of who authored them.

---

## 4. The Four V3 Core Laws (Imperial Override)

These four laws override any softer reading of the prior Architecture Laws.

### Law of Sovereign Singularity
Every functional concern (Cart, Pricing, Auth, Ledger, Inventory, Shift, KDS, Identity, Catalog) MUST have **exactly one** constitutional implementation. Parallel "shadow" implementations — even temporarily — are blocking violations and must be marked `@deprecated` on detection and removed within the same wave.

### Law of Gateway Exclusivity
**No** data-plane access (Supabase client, fetch to external APIs, third-party SDK calls) is permitted outside `src/core/<domain>/gateway/`. Any such call in `src/components/**`, `src/pages/**`, `src/routes/**`, `src/modules/**/components/**`, `src/apps/**`, or `src/hooks/**` is a blocking violation and a CI failure.

### Law of Presentation Purity (V3)
UI components are **Runtime Renderers** only. They consume validated ViewModels and emit typed intents. They MUST NOT:
- Compute prices, discounts, taxes, eligibility, or any business arithmetic.
- Branch on raw role strings.
- Call gateways directly (only through hooks → services → gateways).
- Mutate state without dispatching a typed event/intent.

### Law of Event-Driven Truth
A state change is valid **only if** it is the projection of an immutable event registered in the Sovereign Event Bus (`src/core/events/catalog.ts`). Imperative side-effects in components, hooks, or services that bypass the event log are forbidden. Read models exist to be rebuilt from the event log; if they cannot be, they are illegitimate.

---

## 5. Detected Sovereign Duplications (Initial Top 3)

These are the first three Law 9 / Law of Sovereign Singularity violations targeted for destruction in Wave P-1:

1. **Cart Fragmentation** — Four parallel implementations:
   - `src/context/CartContext.tsx` (legacy React Context)
   - `src/context/SharedCartContext.tsx` (legacy cross-tab bridge)
   - `useCartStore` (Zustand store)
   - `src/core/orders/runtime/CartRuntime.ts` ← **canonical**
   *Action:* keep `CartRuntime`; mark the other three `@deprecated`; replace consumers via `useCartRuntime`.

2. **Pricing Engine Split** — Two arithmetic sources:
   - `src/lib/pricingEngine.ts` + `src/lib/pricingAdapters.ts` (legacy "universal" engine)
   - `src/core/commerce/pricing/PricingEngine.ts` ← **canonical**
   *Action:* re-route every adapter consumer through `core/commerce/pricing`; delete `src/lib/pricingEngine.ts` once orphaned.

3. **Identity / User Type Sourcing** — UI was importing `User` directly from `@supabase/supabase-js` (Wave 1 already migrated 3 files; the remainder of the codebase must be swept).
   *Canonical source:* `src/core/identity` (`AuthUser`).
   *Action:* CI grep gate forbidding `from "@supabase/supabase-js"` outside `src/integrations/supabase/**` and `src/core/**/gateway/**`.

Subsequent duplications (Catalog/Commerce overlap, Hakim Pulse hooks, Observability `console.*` leaks, Cashier/Shift session state) will be enumerated as P-1 progresses.

---

## 6. Acknowledgment Contract

By executing any code change after this date, the agent (human or AI) affirms:

- It has read `SOVEREIGN_V3_MANDATE.md`, `SYSTEM_CONSTITUTION.md`, and `ARCHITECTURE_LAWS.md`.
- It will not introduce new Sovereign Duplications.
- It will not bypass a Gateway.
- It will not place business logic in a component.
- It will not mutate state without a typed event.
- It will respect the Red Line.

Strict adherence to V3 is now the only path.
