# SALSABIL OS — MASTER ROADMAP & PURIFICATION PLAN (A → Z)

> **Status:** Sovereign blueprint. Authoritative end-to-end execution plan.
> **Owner:** Principal Systems Architect — Salsabil OS.
> **Scope:** Salsabil OS + Reef Al Madina + all federated ecosystems
> (Maeen, Asrab Taiba, Nabd, Benaa, Taysir, Hakim, Barq,
> Noor Al-Din University, Al-Muhannad, Afraa).
> **Doctrine:** Stem-Cell Architecture · Capability-Driven · Runtime-Composed ·
> Schema-Validated · Event-Sourced · Apple-Level UX.
>
> This document is the single source of truth for execution. Each phase MUST
> be completed and reviewed before the next begins. No phase may be skipped,
> partially merged, or "temporarily" bypassed. Any deviation requires an ADR
> in `docs/adr/`.

---

## Table of Contents

1. [Phase 1 — Sovereign Purification (5 Waves)](#phase-1--sovereign-purification-the-5-waves)
2. [Phase 2 — Constitution & Kernel Fortification](#phase-2--salsabil-constitution--kernel-fortification)
3. [Phase 3 — Core Base & Stem-Cell Infrastructure](#phase-3--core-base--stem-cell-infrastructure-building)
4. [Phase 4 — External Ecosystems UI Construction](#phase-4--external-ecosystems-ui-construction)
5. [Phase 5 — Reef Al Madina Wave 2 Completion (MVP Launch)](#phase-5--reef-al-madina-wave-2-completion-mvp-launch)
6. [Phase 6 — Civilization Expansion](#phase-6--civilization-expansion)
7. [Cross-Cutting Doctrine](#cross-cutting-doctrine)
8. [Definition of Done — Per Wave](#definition-of-done--per-wave)

---

## Phase 1 — Sovereign Purification (The 5 Waves)

**Goal:** Eradicate the legacy crust documented in `ARCHITECTURE_AUDIT_REPORT.md`.
The codebase MUST exit Phase 1 with **zero direct `supabase.from()` calls in
UI**, **zero static `@/lib/products` imports**, and **zero hardcoded
section-specific pages**.

**Sequencing rule:** Waves are executed strictly in order P-0 → P-A → P-B →
P-C → P-D → P-E. Each wave ends with a green build, a passing lint gate, and
a Definition-of-Done checklist (see below).

---

### Wave P-0 — Guardrails (Freeze the Baseline)

**Intent:** Make all future violations *impossible to merge*, before touching
any runtime code.

**Actions:**

1. **ESLint boundaries**
   - Install and configure `eslint-plugin-boundaries` (and a
     `no-restricted-imports` rule pack).
   - Forbid `@/integrations/supabase/client` imports outside:
     - `src/core/**/gateway/**`
     - `src/core/**/service/**.functions.ts`
     - `src/integrations/supabase/**`
     - `supabase/functions/**`
   - Forbid `@/lib/products` imports anywhere except a single deprecation
     shim (`src/lib/products.ts` re-exporting from the gateway during
     transition; removed in Wave P-B).
   - Forbid imports from `src/apps/**` or `src/pages/**` inside `src/core/**`
     (kernel minimalism, per `KERNEL_MINIMALISM.md`).
   - Forbid `dangerouslySetInnerHTML` driven by runtime descriptors.

2. **Runtime DEV assertions**
   - Add a dev-only `assertNoDirectSupabaseInUI()` in `src/core/runtime-ui/`
     that fails loudly if a UI module attempts to call the Supabase client at
     module scope.
   - Wire `SduiWatchdog` (already present) to `console.error` on unknown
     block kinds, schema failures, and excessive depth in `import.meta.env.DEV`.
   - Add a `trace_id` propagation assertion in every gateway boundary.

3. **CI / pre-commit gates**
   - `lint:boundaries` — fails on any boundary violation.
   - `lint:hardcoded-sections` — grep gate forbidding new occurrences of
     section-slug literals (`"meat"`, `"dairy"`, …) outside
     `SectionRegistry` / `SectionIdentityRegistry`.
   - `lint:hgproduct` — grep gate forbidding new imports of `HGProduct`.

4. **Frozen baseline tag**
   - Snapshot the audit numbers (74 direct supabase calls, 58 static catalog
     importers, etc.) into `docs/baselines/PURIFICATION_BASELINE.md`.
   - Every subsequent wave MUST reduce these numbers monotonically.

**Exit criteria:**
- Build green with new lint rules in **report-only** mode.
- Baseline numbers committed.
- No new violations possible without an explicit ADR override.

---

### Wave P-A — Storefront Purity (`HGProduct` Eradication)

**Intent:** Remove the legacy `HGProduct` view-model and standardize the
storefront on the canonical `ProductCardVM` / `ProductDetailsVM`.

**Actions:**

1. Audit every consumer of `HGProduct` and map each field to its
   `ProductCardVM` equivalent. Document the mapping in
   `docs/migrations/HGPRODUCT_TO_VM.md`.
2. Replace the `HGProduct` mapper with a temporary adapter
   `toProductCardVMFromLegacy()` and route all storefront components through
   it.
3. Migrate components one folder at a time (cards → grids → detail panels →
   bundles → comparisons). Each PR keeps the build green.
4. Delete the `HGProduct` type, mapper, and adapter once all consumers
   compile against `ProductCardVM`.
5. Lock the gain with the `lint:hgproduct` rule promoted from warn → error.

**Exit criteria:**
- `rg "HGProduct"` returns zero hits outside historical docs.
- All storefront cards render from `ProductCardVM` only.
- No visual regression on the storefront preview.

---

### Wave P-B — Static Catalog Killer

**Intent:** Remove `@/lib/products` (and its 58 importers) as a parallel
source of truth. All product reads MUST flow through `catalogGateway`; all
search MUST flow through `searchRegistry`.

**Actions:**

1. Confirm `catalogGateway` exposes parity coverage for every read currently
   served by `@/lib/products` (list-by-section, by-id, by-slug, search,
   relations). Add gateway methods where parity is missing.
2. Convert importers in waves:
   - storefront read paths,
   - hooks (`useProductsQuery`, `useFeaturedCategories`,
     `useBuyAgainProducts`, etc.),
   - admin read paths,
   - tests and fixtures (replace with seeded fakes from
     `scripts/seeds/`).
3. Replace `@/lib/products` with a tombstone module that throws at import in
   non-test environments, then delete it.
4. All search call sites move to `searchRegistry` providers; the legacy
   in-memory filter helpers (`src/lib/sovereignCatalog.ts`,
   `src/modules/search/utils/*`) are reduced to provider plugins.
5. Promote `lint:no-static-catalog` from warn → error.

**Exit criteria:**
- `rg "from \"@/lib/products\""` returns zero hits.
- `searchRegistry.resolve(...)` is the only entry point for product search.
- All Supabase reads for products live behind `catalogGateway`.

---

### Wave P-C — Runtime Route Collapse

**Intent:** Replace every hardcoded section page (`Meat.tsx`, `Dairy.tsx`,
`Pharmacy.tsx`, `Produce.tsx`, `Sweets.tsx`, `HomeGoods.tsx`,
`SchoolLibrary.tsx`, `Kitchen.tsx`, `Restaurants.tsx`,
`Subscriptions.tsx`, `Wholesale.tsx`, …) with a single dynamic route
`src/routes/store.$slug.tsx` driven by `RuntimeRenderer`.

**Actions:**

1. Build `resolveListTree(sectionSlug, vms, viewMode)` parity coverage for
   every existing section's hero, filters, sub-categories, grid, banners,
   and CTAs. Capture each section's identity in `SectionIdentityRegistry`
   (no string-switch in routes).
2. Stand up `src/routes/store.$slug.tsx` that:
   - resolves the `SectionIdentity` via `SectionIdentityResolver`,
   - hydrates list VMs through `catalogGateway`,
   - composes a `RenderDescriptor` via `resolveListTree`,
   - renders with `<RuntimeRenderer />`.
3. Migrate sections one-by-one. For each, snapshot-test the descriptor tree
   (kind/order/depth) so visual parity is enforceable.
4. Delete the legacy page after its descriptor parity is verified.
5. Repeat the same pattern for `ProductDetail` via `resolveDetailsTree` and a
   single `src/routes/store.$slug.$productSlug.tsx`.

**Exit criteria:**
- `src/pages/store/{Meat,Dairy,Pharmacy,Produce,Sweets,...}.tsx` deleted.
- Single dynamic route serves all sections.
- New section onboarding requires **only** a registry descriptor — no new
  route file, no new component, no kernel change.

---

### Wave P-D — Admin & Ops Gateways

**Intent:** Move all direct `supabase.from()` calls in
`src/pages/admin/**`, `src/pages/driver/**`, `src/pages/vendor/**`, and
`src/features/**` into domain-specific server gateways.

**Actions:**

1. Inventory the 74 direct calls from the audit. Group by domain:
   - `adminGateway` (catalog admin, role admin, settings),
   - `opsGateway` (drivers, dispatch, logistics),
   - `vendorGateway` (vendor catalog, vendor wallet, vendor orders),
   - `accountGateway` (profile, addresses, payments, notifications),
   - `financeGateway` (wallet, transfers, gameyas — extending existing
     `src/core-os/finance/**`),
   - `restaurantGateway` (kitchen, menus, prep).
2. For each gateway:
   - Define typed Zod schemas for inputs and outputs.
   - Express server logic as `createServerFn` handlers under a
     `*.functions.ts(x)` module path (per the server-function authoring
     rules).
   - Gate every mutation with `requireCapability(...)` middleware (server
     side).
   - Emit observability `trace_id` spans on entry/exit.
3. Refactor each page/hook to consume the gateway. No `supabase.from(` may
   remain in `src/pages/**`, `src/components/**`, `src/hooks/**`, or
   `src/features/**`.
4. Promote `lint:no-supabase-in-ui` from warn → error.

**Exit criteria:**
- `rg "supabase\\.from\\(" src/pages src/components src/hooks src/features`
  returns zero hits.
- Every admin/driver/vendor mutation passes through a typed server function
  with capability middleware.

---

### Wave P-E — Capability-Driven Event Spine

**Intent:** Wire `capabilityRegistry` into every UI conditional and
standardize mutations as typed domain events on the event spine.

**Actions:**

1. Replace every `if (user.role === ...)`, every inline allowed-roles list,
   and every ad-hoc `isAdmin` check with:
   - `useCapability("...")` for hooks,
   - `<CapabilityGuard cap="...">` for UI.
2. Server functions add `requireCapability(...)` middleware uniformly. Any
   missing capability fails closed and emits an observability event.
3. Stand up `src/core/events/`:
   - `catalog.ts` — registry of named events (`order.placed`,
     `cart.item.added`, `wallet.credit.granted`, …).
   - `bus.ts` — typed pub/sub with idempotency keys (`event.id`).
   - Per `EVENT_SYSTEM.md`, only gateways/server functions emit; UI emits
     **intents**, never events.
4. Convert the highest-leverage mutations first:
   - `commerce.placeOrder` → emits `order.placed`.
   - `wallet.transfer` → emits `wallet.transfer.completed`.
   - `catalog.publish` → emits `catalog.product.published`.
5. Replace ad-hoc realtime subscriptions with event-bus subscriptions whose
   projections rebuild from the log.
6. Promote `lint:no-role-checks` from warn → error.

**Exit criteria:**
- No role-string comparisons anywhere in the repo.
- All sensitive mutations have a corresponding event + audit row.
- AI candidates route through Propose → Dispose with event emission only on
  human/policy approval (per `AI_GOVERNANCE.md`).

---

## Phase 2 — Salsabil Constitution & Kernel Fortification

**Goal:** Make the constitutional layer the *non-negotiable* governance of
the codebase. The constitution files already initialized are promoted from
"documentation" to "gating policy" via lint rules, code reviews, and ADRs.

**Constitutional documents (under `docs/constitution/`):**

1. **`SYSTEM_CONSTITUTION.md`** — Foundational principles, universal
   prohibitions, and the immutable doctrine (Stem-Cell, Capability-Driven,
   Schema-Validated, Event-Sourced, Sovereign).
2. **`ARCHITECTURE_LAWS.md`** — Hard layering laws:
   `Apps → Presentation → Domain → Kernel → Data Plane`. One-way deps.
3. **`DOMAIN_BOUNDARIES.md`** — Bounded contexts (Catalog, Commerce, Finance,
   Identity, Ops, Logistics, AI). Cross-domain reads only via published
   contracts.
4. **`CAPABILITY_SYSTEM.md`** — Atomic capability keys, registry, resolution
   pipeline, sensitivity tiers, audit obligations.
5. **`RUNTIME_SCHEMA_SPEC.md`** — Zod-validated SDUI descriptors, VMs,
   events, and AI outputs. Nothing renders or persists without validation.
6. **`EVENT_SYSTEM.md`** — Append-only event spine, naming, versioning,
   idempotency, projections, audit.

**Fortification actions:**

- Each constitution file gets a corresponding lint or test enforcement.
- Each PR template references the article(s) it touches.
- Violations require an ADR (`docs/adr/NNNN-*.md`) — no silent overrides.
- A `docs/constitution/INDEX.md` is created to map every law to its
  enforcement mechanism (lint rule, test, runtime guard, code review item).

**Exit criteria:**
- Constitution files exist, are referenced by `eslint.config.js`, and are
  cited in PR descriptions.
- New contributors can onboard by reading the constitution + this roadmap
  alone.

---

## Phase 3 — Core Base & Stem-Cell Infrastructure Building

**Goal:** Solidify the kernel — the policy-free mechanism layer that every
ecosystem composes against. Nothing in this phase encodes business rules;
everything is a registry, a resolver, or a renderer.

**Pillars:**

1. **Capability Runtime**
   - `src/core/capabilities/CapabilityRegistry.ts` — declarative registry.
   - `src/core/capabilities/resolver` — server-side resolution
     (`session × workspace × overrides → capability set`), cached per
     `(user_id, workspace_id)`.
   - `useCapability` + `<CapabilityGuard>` as the only UI primitives.
   - `requireCapability` middleware for every server function.

2. **Block Registries & Runtime UI**
   - `src/core/runtime-ui/RuntimeRenderer.tsx` (present) — renders
     `RenderDescriptor` trees via `blockRegistry`.
   - `src/core/runtime-ui/blocks/registerCoreBlocks.ts` — canonical block
     set (section header, product grid/list, gallery, price, variants,
     addons, description, nutrition, diet flags, relations, add-to-cart,
     quick-buy bar, subscribe CTA).
   - `src/core/runtime-ui/cards/CardTemplateRegistry.ts` — pluggable card
     templates per section identity.
   - `SduiWatchdog` enforces runtime invariants (depth, schema, unknown
     kinds).

3. **Catalog Gateway (Civilization Foundation)**
   - `src/core/catalog/gateway/catalogGateway.ts` — single read/write
     facade.
   - `src/core/catalog/service/CatalogService.ts` — front-end facade calling
     `createServerFn` handlers (no client-side `supabase.from`).
   - `ProductHydrationPipeline` + `ProductViewModelFactory` produce
     `ProductCardVM` and `ProductDetailsVM` — the only product VMs allowed.
   - `RecommendationResolver` for relations.
   - `SectionIdentityRegistry` + `SectionIdentityResolver` define section
     identity declaratively.

4. **Feeds, Search, Media**
   - `FeedRuntime` (kind-based, no per-section branches) drives home,
     offers, recommendations, search, section, trending feeds.
   - `searchRegistry` exposes provider abstraction; default provider in
     `src/core/search/providers/defaultProvider.ts`.
   - `MediaResolver` + `LazyImage` standardize all image rendering.

5. **Event Spine & Observability**
   - `src/core/events/` (catalog + bus) per `EVENT_SYSTEM.md`.
   - `sovereignTracing.ts` propagates `trace_id` end-to-end.
   - Audit emission for sensitivity ≥ financial.

**Exit criteria:**
- Kernel modules contain *zero* tenant/section/role branches.
- Adding a new section, capability, or block requires only registry data.
- Removing every `src/apps/**` and `src/pages/**` would still leave the
  kernel building, testing, and rendering synthetic descriptors.

---

## Phase 4 — External Ecosystems UI Construction

**Goal:** Generate the runtime-driven shells for the federated ecosystems on
top of the now-mature kernel. Each ecosystem is an *app* under
`src/apps/<name>/`, composed exclusively of registries, descriptors, and
gateway calls.

**Ecosystems & shells:**

| Ecosystem | Individuals shell | Business shell | Key gateways |
|---|---|---|---|
| **Maeen** (delivery) | `apps/maeen/individuals` | `apps/maeen/business` | `opsGateway`, `logisticsGateway` |
| **Asrab Taiba** (savings/social finance) | `apps/asrab/individuals` | `apps/asrab/business` | `financeGateway`, `gameyasGateway` |
| **Nabd** (community/health pulse) | `apps/nabd/individuals` | `apps/nabd/business` | `pulseGateway`, `identityGateway` |
| **Benaa** (construction/services) | — | `apps/benaa` | `projectsGateway`, `procurementGateway` |
| **Taysir** (rapid pay/lending) | — | `apps/taysir` | `paymentsGateway`, `creditGateway` |
| **Hakim** (AI advisor) | embedded | embedded | `aiGateway` (Propose → Dispose) |
| **Barq** (logistics) | — | `apps/barq` | `logisticsGateway` |
| **Noor Al-Din University** | `apps/noor-eldin/students` | `apps/noor-eldin/admin` | `learningGateway`, `identityGateway` |
| **Al-Muhannad** (engineering) | — | `apps/al-muhannad` | `projectsGateway` |
| **Afraa** (events / ceremonies) | `apps/afraa/individuals` | `apps/afraa/business` | `eventsGateway`, `bookingsGateway` |

**Construction rules (apply to every ecosystem):**

1. The app shell registers section identities and block templates only — no
   bespoke Supabase calls, no static product imports.
2. Every page renders `<RuntimeRenderer />` against a descriptor produced by
   a domain `resolveTree*` function.
3. Every mutation routes through a typed server function with capability
   middleware and event emission.
4. Every screen has a `head()` (title/description/og) per the SEO and
   TanStack Start route conventions.
5. AI surfaces follow `AI_GOVERNANCE.md`: AI proposes; humans (or validated
   policy) dispose.

**Exit criteria:**
- Each ecosystem boots with a runtime-rendered home, search, detail, and
  account flow.
- No ecosystem contains direct DB calls, static catalogs, or hardcoded
  section logic.
- New ecosystems can be scaffolded by copying an `apps/<name>/` shell and
  registering descriptors — no kernel change required.

---

## Phase 5 — Reef Al Madina Wave 2 Completion (MVP Launch)

**Doctrine reframe (100x Scale).** Reef Al Madina is **not** a grocery
delivery app. It is the **Standard Model Sovereign Runtime Ecosystem** —
the reference node of Salsabil OS proving that a single capability- and
descriptor-driven kernel can host **infinite operational complexity**:
sovereign financial flows (Taysir wallet limits, family graph, lending),
swarm logistics (Barq real-time dispatch), cross-platform commerce
(Asrab social finance, vendor federations), and arbitrarily many
physical-market verticals — all without a single bespoke route, page,
component, or `if (section === "...")` branch.

**Sovereign Interconnectivity.** Reef Al Madina operates as one node in
a federation. It MUST consume — never re-implement — the following
sovereign spines:

- **Barq** — real-time logistics, swarm dispatch, ETA, geo-fencing.
- **Taysir** — financial ledger, wallet limits, family graph, rapid pay,
  credit posture.
- **Asrab** — social/communal finance (gameyas, savings circles).
- **Hakim** — AI advisor (Propose → Dispose, never autonomous).
- **Maeen** — last-mile delivery surface.
- **Nabd / Afraa / Benaa / Noor / Al-Muhannad** — federated read/write
  via published gateway contracts only.

**Anti-Hardcoding Mandate (binding for this entire phase).** The
codebase MUST NOT contain logic, types, components, routes, hooks, or
literals tailored to specific physical-market verticals. Examples of
**forbidden** identifiers in `.ts`/`.tsx` source: `crepes`, `potato`,
`sandwich`, `ice_cream`, `iceCream`, `falafel`, `shawarma`, `pharmacy`,
`butcher`, `bakery`, `meat`, `dairy`, `produce`, `sweets`, `kitchen`,
`restaurant`, `wholesale`, `village`, `school`, `library`, etc., when
used as **business-logic switches**. Such terms may exist **only** as:

- string values inside `SectionIdentityRegistry` / capability bundles /
  block descriptors persisted in the database or seed JSON,
- localized labels in i18n catalogs,
- migration / seed scripts.

Any `if`, `switch`, `?:`, type union, or component name that encodes
domain knowledge of a specific vertical is a constitutional violation.

**Workstreams:**

1. **Storefront completion (Capability + Descriptor only)**
   - Every existing section (Meat, Dairy, Produce, Pharmacy, Sweets,
     HomeGoods, SchoolLibrary, Kitchen, Restaurants, Subscriptions,
     Wholesale, Village, Recipes, Baskets) is served by the **single**
     dynamic route `store.$slug.tsx` resolving against
     `SectionIdentityRegistry`. No section owns a `.tsx` file.
   - **New physical-market verticals (e.g. crepes, potato sandwiches,
     ice cream, or any future vertical) are launched purely by:**
     1. inserting a `SectionIdentity` row,
     2. registering the required `Capability` keys,
     3. publishing a `RenderDescriptor` (header + filters + grid + CTA)
        via `ui_layouts`,
     4. (optional) registering a new `CardTemplate` in
        `CardTemplateRegistry` if the vertical needs bespoke card chrome.
   - **Zero** new routes, **zero** new components, **zero** new hooks,
     **zero** kernel changes are permitted to onboard a vertical. If a
     vertical "needs code", the kernel is missing a generic capability —
     extend the kernel generically, never the vertical specifically.

2. **Commerce completion**
   - Cart, checkout, order placement, post-order tracking — all wired to
     `commerceGateway` emitting `order.placed`, `order.fulfilled`, …
   - Integration with `barqLogistics` for dispatch and `taysir` for payment.

3. **Operations**
   - Vendor catalog/orders/wallet via `vendorGateway` with capability gates.
   - Driver tasks/wallet/map via `opsGateway` + `logisticsGateway`.
   - Admin dashboards via `adminGateway` (read) and capability-gated
     mutations.

4. **AI surfaces**
   - Hakim advisor rendered as candidates only; mutations require human
     dispose.
   - Predictive cart and product image generation as background candidate
     producers.

5. **Observability & audit**
   - End-to-end `trace_id` for every cart → order → fulfillment → payout
     chain.
   - Audit rows for every financial event.

6. **Launch hardening**
   - Performance budgets per route (LCP, INP, JS bytes).
   - SEO sweep (titles, descriptions, og:images per section/product).
   - PWA + offline queue (`offlineSyncQueue`) verified.

**Exit criteria:**
- Reef Al Madina passes a full E2E checkout on every section.
- New physical-market verticals (crepes, potato sandwiches, ice cream,
  and any future vertical) are live **purely** via registry/descriptor
  rows and feature flags — `git diff` for their launch contains **no**
  `.ts`/`.tsx` source changes (only DB seeds, registry data, layouts).
- Reef Al Madina demonstrably consumes Barq, Taysir, and Asrab as
  external sovereign nodes (no in-tree re-implementation).
- Zero constitutional violations in CI, including the Anti-Hardcoding
  Law lint gate (`lint:no-vertical-literals`).

---

## Phase 6 — Civilization Expansion

**Goal:** With Reef Al Madina proven on the purified kernel, return to each
ecosystem from Phase 4 and complete its missing operational modules,
reusing the now-mature infrastructure.

**Per ecosystem, complete:**

- Domain-specific gateways (extending the kernel-shaped patterns).
- Operational dashboards for the business shells.
- Capability bundles per role (declared, never hardcoded).
- Event subscriptions + projections.
- AI advisor surfaces (Hakim) where applicable.
- Observability dashboards and audit retention policies.
- Public landing routes with full SEO heads (per TanStack Start conventions).

**Reuse leverage:**

- Block templates ported from Reef Al Madina by registration.
- Card templates extended via `CardTemplateRegistry`.
- Search providers swapped per ecosystem via `searchRegistry`.
- Logistics, payments, identity, AI all consumed as kernel capabilities.

**Exit criteria:**
- Every ecosystem operates end-to-end on Salsabil OS.
- Adding a new ecosystem is a multi-day exercise (registry + descriptors),
  not a multi-month one (no new kernel work).
- The federation runs as a single sovereign OS with isolated domains and a
  shared spine.

---

## Cross-Cutting Doctrine

These rules apply across **every** phase and wave. Violations are blocking.

1. **No hardcoded business logic.** All policy lives in registries,
   descriptors, or capability bundles.
2. **No direct Supabase in UI.** Only gateways under `src/core/**/gateway/`
   or `*.functions.ts` may call the client.
3. **No dual sources of truth.** `@/lib/products` and similar static stores
   are forbidden post-Wave P-B.
4. **No role-string checks.** Capabilities only.
5. **No unvalidated descriptors.** Zod-parse before render or persist.
6. **Events are append-only.** Corrections via compensating events.
7. **AI proposes, humans dispose.** No autonomous mutations.
8. **`trace_id` everywhere.** Untraceable actions are forbidden.
9. **Kernel is policy-free.** If a kernel change adds a `case` per
   tenant/section/role, the design is wrong — convert to descriptor.
10. **Apple-level UX.** Composition, restraint, motion-with-purpose, no
    generic AI aesthetics, no two surfaces look identical without intent.

---

## Definition of Done — Per Wave

A wave is **Done** only when **all** of the following are true:

- [ ] All planned actions merged to main.
- [ ] Build green (`vite build`) on the workspace.
- [ ] Lint gates promoted as scheduled (warn → error where specified).
- [ ] Baseline counters in `docs/baselines/PURIFICATION_BASELINE.md`
      updated and monotonically improved.
- [ ] No new constitutional violations introduced (verified by CI).
- [ ] Observability spans present at every new gateway boundary.
- [ ] Audit rows emitted for every new sensitive mutation.
- [ ] ADR filed for any deviation, with reviewer sign-off.
- [ ] Section/PR description cites the constitution articles touched.
- [ ] Visual / E2E parity verified for affected user surfaces.

---

*This document is the sovereign roadmap. It is read before every wave,
referenced in every PR, and amended only by ADR. Memory is fallible;
this plan is not.*
