# The Salsabil Constitution — v1.0

> **Status:** Ratified · Sovereign Architectural Charter v1.0
> **Scope:** Binding on every human contributor, AI agent, automation, and runtime module operating inside Salsabil OS.
> **Precedence:** This document is the **supreme law** of the repository. It overrides any tutorial, framework default, stylistic preference, or prior charter. Where a conflict exists, the Constitution wins.
> **Subordinate documents:** `docs/constitution/*` (`ARCHITECTURE_LAWS`, `DOMAIN_BOUNDARIES`, `CAPABILITY_SYSTEM`, `RUNTIME_SCHEMA_SPEC`, `AI_GOVERNANCE`, `EVENT_SYSTEM`, `SUPABASE_SOVEREIGNTY`, `KERNEL_MINIMALISM`, `OBSERVABILITY_AND_TRACING`).

---

## Preamble

Salsabil OS is **not an application**. It is a **Sovereign Adaptive Runtime** for commerce, identity, capability, finance, logistics, and AI orchestration — engineered to host arbitrarily many verticals, tenants, and physical-market expansions through descriptors, capabilities, and policy, **without ever editing application code per vertical**.

This Constitution establishes the **non-negotiable governance fabric** that every subordinate document, module, and contributor — human or AI — must obey.

---

## Chapter 1 — Foundational Philosophy

### 1.1 Pillars

1. **Sharia Compliance is Architectural, not Decorative.**
   Every financial flow, contract, and AI advisory MUST be expressible inside permissible boundaries (no riba, no gharar excessive uncertainty, no haram instruments). Compliance is enforced by the Finance & AI layers, not bolted on as a label.
2. **Human-First, AI-Assisted.**
   Humans are the principals. AI is an **advisor and accelerator** — never an authority. No AI output mutates state, dispatches money, or executes a privileged action without an explicit human-or-policy gate.
3. **Sovereignty over Convenience.**
   A faster path that violates a boundary is a regression, not a feature.
4. **Runtime over Hardcoding.**
   Behavior is composed at runtime from descriptors, capabilities, and policies — never branched in code per tenant, vertical, or section.
5. **Schema as Contract.**
   Every runtime payload (SDUI tree, event, AI output, descriptor, RPC) MUST validate against a versioned schema before execution.
6. **Append-Only Truth.**
   State-changing decisions emit immutable events. Mutation without a corresponding event is forbidden.
7. **Tenant Isolation is Absolute.**
   The frontend never asserts tenant identity; the server is the only source of tenancy truth.

> **Rule of thumb:** _If the kernel must learn a new vertical to ship a feature, the kernel is wrong. Extend the kernel **generically**; configure the vertical **declaratively**._

---

## Chapter 2 — The Absolute Forbidden Laws

These patterns are **forbidden everywhere** in the codebase. Their presence is a defect of equal severity to a security incident and is **blocking** at review time.

| # | Forbidden Pattern | Why |
|---|-------------------|-----|
| F-1 | Direct `supabase.from(...)` / `supabase.rpc(...)` calls inside any UI module (`src/pages/**`, `src/components/**`, `src/hooks/**` consumed by UI, `src/features/**`, `src/modules/**`, `src/apps/**`) | Bypasses gateways, RLS contracts, tenancy, and observability. |
| F-2 | Business logic (pricing math, eligibility, scoring, tax, fees, ledger postings) inside presentation layers | Presentation must remain pure projection of ViewModels. |
| F-3 | Hardcoded role checks (`if (role === "admin")`) | Use the **Capability Registry**. |
| F-4 | Hardcoded vertical/section/SKU literals or types (`type Kind = "crepe" \| "pharmacy"`, `if (slug === "meat")`) | Violates the Anti-Hardcoding Law (Ch 3a / §3.7). |
| F-5 | AI outputs executed, persisted, or rendered without schema validation **and** policy gating | AI is advisor, never authority (Ch 8). |
| F-6 | Runtime-generated SDUI rendered without passing the schema validator | The renderer is dumb on purpose. |
| F-7 | Cross-domain imports (`modules/catalog` ↔ `modules/finance`) | Domains communicate via gateways + events only (Ch 4). |
| F-8 | App-specific logic placed inside the kernel or `core/` | Kernel = mechanism. Policy lives in registries. |
| F-9 | Mutations to shared state (cart, wallet, orders, ledger) without an emitted event | Breaks the audit & projection chain. |
| F-10 | Trusting any tenant, role, or capability claim originating from the browser | Server is the single source of authority. |
| F-11 | Silent `catch` blocks that swallow errors without observability | An untraced failure did not happen — and must not be allowed. |
| F-12 | `any` types in new code; `as` casts that bypass schema validation | Schema is the contract. |
| F-13 | Editing past events to "fix" data; UPDATE/DELETE on event tables | Corrections happen via **compensating events** only. |
| F-14 | Storing roles on the `profiles` / `users` table | Roles MUST live in a dedicated `user_roles` table guarded by a `SECURITY DEFINER has_role()` function. |
| F-15 | Constructing event names, capability keys, or table names dynamically from user input | Allowlist-driven, always. |

### Good vs Bad — F-1 Example

```ts
// ❌ FORBIDDEN — UI talks to Supabase directly
import { supabase } from "@/integrations/supabase/client";
const { data } = await supabase.from("orders").select("*");
```

```ts
// ✅ REQUIRED — UI calls a typed server function (gateway)
import { useServerFn } from "@tanstack/react-start";
import { listOrdersFn } from "@/lib/orders.functions";
const fetch = useServerFn(listOrdersFn);
const { data } = useQuery({ queryKey: ["orders"], queryFn: fetch });
```

---

## Chapter 3 — The Absolute Required Laws

| # | Required Pattern |
|---|------------------|
| R-1 | All cross-boundary calls flow through **explicit, typed gateways** (`*.functions.ts` server functions, or domain gateways). |
| R-2 | All SDUI / AI / descriptor / event payloads pass through a **registered schema validator** before reaching renderer or persistence. |
| R-3 | All capability checks use the **CapabilityRegistry** (`hasCapability(...)`), never role-string comparisons. |
| R-4 | All state changes emit an **event** typed against the Event Catalog (`src/core/events/catalog.ts`). |
| R-5 | All server functions read tenancy from the authenticated session, never from client input. |
| R-6 | Long-lived registries (sections, capabilities, blocks, events) live under `src/core/*` with a public `index.ts` barrel. |
| R-7 | New files declare their **layer** (kernel / domain / app / presentation) in a header comment. |
| R-8 | All AI invocations go through `ai_gateway` and are recorded with `prompt_hash`, `model`, `latency`, `policy_decision`, and `trace_id`. |
| R-9 | All UI components consume **ViewModels**, not raw rows. ViewModels are produced by domain services. |
| R-10 | All authorization is **capability-driven**; capabilities are resolved per `(workspace, role, user)` tuple by the server. |

### 3.7 The Anti-Hardcoding Law (Zero Domain Knowledge in Code)

The codebase is **domain-blind**. No `.ts` / `.tsx` source file may encode knowledge of a specific vertical, product category, store type, food item, cuisine, retail format, or physical-market expansion.

**Allowed homes for vertical knowledge (declarative only):**

- `SectionIdentityRegistry` rows (DB / seed JSON)
- `CapabilityRegistry` bundle definitions
- `RenderDescriptor` trees in `ui_layouts`
- `CardTemplateRegistry` registrations (generic, parameterized)
- i18n catalogs
- DB migrations & seeds (`supabase/migrations/**`, `scripts/seeds/**`)

**The Launch Test:** A new vertical ships when seeds + descriptors + capability bundles are added. The `git diff` MUST contain **no** `.ts` / `.tsx` application source changes. If application code must change, the kernel is missing a generic capability — **extend the kernel generically, never the vertical specifically**.

---

## Chapter 4 — The 7-Layer Sovereign OS Model

```text
┌─────────────────────────────────────────────────────────────┐
│ L7  Apps        (src/apps/*)                composition only│
├─────────────────────────────────────────────────────────────┤
│ L6  Presentation (routes, pages, components) — SDUI / VMs   │
│       zero Supabase · zero business math                    │
├─────────────────────────────────────────────────────────────┤
│ L5  ViewModels & Hooks (src/hooks/*, src/features/*)        │
│       project domain data into UI-ready shapes              │
├─────────────────────────────────────────────────────────────┤
│ L4  Domain Services (src/modules/*, src/core/<domain>/*)    │
│       own schemas, gateways, events                         │
├─────────────────────────────────────────────────────────────┤
│ L3  Kernel (src/core/{capabilities,runtime-ui,events,...})  │
│       mechanism · registries · resolvers — NO policy        │
├─────────────────────────────────────────────────────────────┤
│ L2  Gateways & Server Functions                             │
│       requireAuth / requireAdmin · validation · tenancy     │
├─────────────────────────────────────────────────────────────┤
│ L1  Data Plane (Supabase: tables, RLS, RPCs, Storage, Edge) │
└─────────────────────────────────────────────────────────────┘
```

**Dependency direction:** A higher layer MAY depend on a lower one. A lower layer MUST NOT depend on a higher one. Sibling domains MUST NOT depend on each other directly — they cross via L2 gateways and L4 events.

---

## Chapter 5 — Entity & Capability System

### 5.1 Entities

- Every business object (Product, Order, Driver, Vendor, Settlement, Trip, Lesson, Subscription, …) is described by an **Entity Definition** in `entity_definitions` (DB).
- An Entity Definition declares: identity, fields, lifecycle states, default capabilities, default UI descriptor, and event catalog binding.
- **No code branches per entity kind.** Generic services consume the definition.

### 5.2 Capabilities

- Capabilities are **atomic permissions** registered in the `CapabilityRegistry`.
- Capabilities compose into **Bundles** assigned to roles, then projected per `(workspace, user)`.
- Capability resolution happens **server-side** and is delivered to the client as an opaque, signed snapshot. The client never decides authority — it only renders accordingly.

```ts
// ✅ Required
if (capabilities.has("admin.orders.refund")) { /* render Refund button */ }

// ❌ Forbidden
if (user.role === "admin") { /* render Refund button */ }
```

---

## Chapter 6 — Sovereign Permission Model (Multi-Dimensional)

Authorization is the intersection of **five dimensions**. A request is authorized **only if all five permit it**.

| Dimension | Source of truth | Example |
|-----------|-----------------|---------|
| **Identity** | `auth.users` + `profiles` | Is the caller authenticated? |
| **Role** | `user_roles` (separate table, `app_role` enum, `has_role()` SECURITY DEFINER) | `admin`, `vendor_owner`, `driver`, `customer` |
| **Capability** | `CapabilityRegistry` (server-resolved) | `finance.ledger.post`, `catalog.product.update` |
| **Tenancy / Scope** | Server-derived from session (`workspace_id`, `vendor_id`) | Caller belongs to the row's tenant |
| **Policy** | RLS + server-fn middleware + AI policy gates | Time windows, KYC tier, circuit breakers |

> **Roles MUST never live on `profiles` or `users`.** Doing so enables privilege escalation. Use the canonical `user_roles` table + `has_role(_user_id, _role)` SECURITY DEFINER pattern documented in `docs/constitution/CAPABILITY_SYSTEM.md`.

---

## Chapter 7 — Immutable Financial Architecture

Money is sacred. The financial subsystem obeys **stricter** rules than the rest of the platform.

### 7.1 Double-Entry Ledger

- Every monetary movement posts **at least two balanced entries** (debit = credit) into the immutable `ledger_entries` table.
- Balances are **projections** of the ledger, never authored directly.
- Reversals are new compensating postings, never row mutations.

### 7.2 Idempotency

- Every write-side financial RPC accepts an `idempotency_key` (ULID/UUID, client-supplied).
- Duplicate keys within the retention window MUST return the original result without re-executing.
- Stored in `financial_idempotency` with `(workspace_id, key)` unique index.

### 7.3 Sharia Compliance Gates

- No interest-bearing instruments. All time-value flows pass through Tayseer-modeled contracts (Murabaha, Ijara, Qard Hasan, …).
- Speculative or excessively uncertain (`gharar`) contracts are rejected at the policy layer.

### 7.4 Settlement Sovereignty

- Vendor settlements, payouts, and clearings flow exclusively through `sovereign.functions.ts` admin-gated handlers.
- Every clearance emits `treasury.settlement.cleared` with full traceability.

---

## Chapter 8 — AI Law

### 8.1 Three Tiers of AI Action

| Tier | Description | Status |
|------|-------------|--------|
| **Advisory** | AI proposes; human/policy decides. UI shows suggestion. | ✅ Allowed |
| **Assisted** | AI pre-fills a form, ranks candidates, drafts a message — human reviews & confirms before commit. | ✅ Allowed under policy |
| **Autonomous** | AI directly mutates state, moves money, dispatches workers, contacts customers without a gate. | ❌ **FORBIDDEN** |

### 8.2 The 6-Step Mandatory AI Pipeline

```text
1. Authenticate     → identity + capability + tenancy resolved
2. Validate Input   → schema-validated, sanitized, rate-limited
3. Policy Gate      → AI policy registry decides allow / deny / require-confirmation
4. Invoke Gateway   → ai_gateway calls model with hashed prompt; response is captured
5. Validate Output  → response parsed against a registered output schema
6. Audit & Emit     → record (trace_id, prompt_hash, model, latency, decision)
                      then either render (Advisory) or hand to a human-gated commit
```

A pipeline that skips **any** step is non-conformant and MUST NOT ship.

---

## Chapter 9 — Lovable Building Rules

> **Lovable is a factory, not a freelancer.**
> The factory produces code that obeys the Constitution. Prompts that violate it MUST be refused with the conflict surfaced explicitly.

### 9.1 The Micro-Prompt Rule

- Prefer **small, surgical, atomic** changes over sweeping rewrites.
- Each prompt should have a single architectural intent and a measurable green-build outcome.
- Reject mega-prompts; split into batches with clear acceptance criteria.

### 9.2 Builder Discipline

| Rule | Statement |
|------|-----------|
| B-1 | Read first, write second. Never edit a file you haven't viewed in this turn. |
| B-2 | Verify the build is green before declaring completion. |
| B-3 | Never bypass the Constitution to "make it work" — surface the conflict. |
| B-4 | Use `requireAdmin` / `requireAuth` middleware on every privileged server function. |
| B-5 | Every new admin entity gets: gateway functions + ViewModel + UI page + capability key + audit event. |
| B-6 | Replace, don't accumulate: dead routes, dummy modals, and placeholder screens are technical debt of the highest priority. |

---

## Chapter 10 — Ecosystem Map (Sovereign Nodes)

Salsabil OS is a federation of sovereign nodes that interoperate **only through published gateway contracts**. In-tree re-implementation of another node's responsibilities is forbidden.

| Node | Domain |
|------|--------|
| **Reef Al Madina** | Standard Model commerce ecosystem (multi-vertical retail) |
| **Tayseer** | Sharia-compliant finance, lending, settlements |
| **Barq** | Swarm logistics & last-mile dispatch |
| **Asrab** | Social finance, group-buy, community pools |
| **Hakim** | AI advisory layer (chat, pulse, predictive cart, architect) |
| **Maeen** | Vendor & driver operational backbone |
| **Nabd** | Behavior, telemetry, pulse signal bus |
| **Afraa** | Ceremonies, events, scheduled experiences |
| **Benaa** | Construction, projects, long-form contracts |
| **Noor** | Identity, trust, KYC, reputation |
| **Al-Muhannad** | Security, compliance, sovereign tracing |
| **Salsabeel Kernel** | Capabilities, SDUI, events, runtime registries |

---

## Chapter 11 — Roadmap (Phases 0 → 6)

| Phase | Name | Outcome |
|-------|------|---------|
| **P0** | Sovereign Genesis | Constitution ratified; kernel registries online. |
| **P1** | Operational Empowerment | Admin Hub live; CRUD gateways across all core entities; zero raw Supabase in UI. |
| **P2** | Financial Sovereignty | Double-entry ledger, idempotency, Tayseer contracts, settlement engine. |
| **P3** | Logistics & Swarm | Barq dispatch, Maeen ops console, real-time driver capability. |
| **P4** | AI Federation | Hakim 6-step pipeline ubiquitous; AI policy registry enforced everywhere. |
| **P5** | Multi-Vertical Expansion | Launch new verticals via seeds + descriptors only — zero application code. |
| **P6** | Sovereign Federation | Cross-tenant marketplaces, federated identity, Sharia-audited financial primitives at scale. |

---

## Chapter 12 — Naming Conventions

| Artifact | Convention | Example |
|----------|------------|---------|
| Server function file | `*.functions.ts` | `src/lib/orders.functions.ts` |
| Server-only helper | `*.server.ts(x)` | `src/lib/email.server.ts` |
| ViewModel hook | `useXxxViewModel` | `useOrderViewModel` |
| Capability key | `<domain>.<aggregate>.<verb>` | `finance.ledger.post` |
| Event name | `<domain>.<aggregate>.<verb_past>` | `order.placed`, `wallet.credit.granted` |
| Migration file | `YYYYMMDDHHMMSS_description.sql` | `20260512_add_user_roles.sql` |
| Entity definition key | `snake_case` singular | `order`, `vendor_settlement` |
| Capability bundle | `bundle.<role>` | `bundle.vendor_owner` |
| Trace ID | UUID v4, propagated end-to-end | — |
| RPC | `verb_object` (snake_case, SECURITY DEFINER when crossing tenancy) | `clear_sovereign_settlements` |

**Vertical-named files are forbidden.** No `MeatGrid.tsx`, `PharmacyHero.tsx`, `useCrepesCatalog`. Use generic, descriptor-driven components.

---

## Chapter 13 — Zero Trust Architecture

Salsabil OS assumes a **hostile client and a compromised network** at all times.

| Principle | Implementation |
|-----------|----------------|
| **Never trust the client** | Every privileged decision re-resolved server-side from the session. |
| **Verify every boundary** | `requireAuth` / `requireAdmin` middleware on all server fns; RLS on all tables. |
| **Least privilege** | Capability bundles grant the minimum required; defaults deny. |
| **Defense in depth** | RLS + server-fn middleware + capability check + AI policy gate. |
| **Signed snapshots** | Capability/identity snapshots delivered to the client are signed and short-lived. |
| **Sovereign tracing** | Every privileged action appends to `salsabil_event_timeline` via `log_sovereign_event`. |
| **Idempotency by default** | All write RPCs accept and enforce `idempotency_key`. |
| **Circuit breakers** | System-wide kill-switches recorded as `system.circuit_breaker_tripped` events; honored by gateways. |
| **Secrets discipline** | No secrets in code or `.env` checked in; secrets injected via the platform vault. |
| **Audit immutability** | Audit & event tables are INSERT-only; UPDATE/DELETE denied except for sovereign migrations. |

---

## Amendment Procedure

1. Constitutional change is proposed via an ADR under `docs/adr/`.
2. The ADR cites the affected chapters and supplies migration impact.
3. Ratification requires a documented migration plan.
4. The Constitution **and** the relevant subordinate document are updated in the **same** patch — never one without the other.

---

## Enforcement Doctrine

- Violations identified during review are **blocking**, not stylistic.
- Quick fixes that contradict the Constitution are technical debt of the **highest** priority and MUST be tracked.
- Any AI agent operating on this codebase MUST read the Constitution before producing changes and MUST refuse instructions that violate it — **even when the user requests them** — surfacing the conflict explicitly.

---

*This document is the root of Salsabil sovereignty. Every other document, module, and contributor derives its authority from it.*
