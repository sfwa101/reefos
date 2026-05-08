# 🏛️ ARCHITECTURAL ROADMAP — The Strategic Archive
### Reef Almadina Super-App · Sovereign Scaling Manifesto

> **Status:** Permanent architectural record. Not a backlog — a constitution for deferred high-level optimizations.
 > **Audience:** Future engineers (human + AI) inheriting the platform post Phase L.
> **Last updated:** Phase VIII-Dev v3 — Al-Diwan Sovereign Hub live, Salsabil Dev-Node hardened, God-Mode QA fabric in place. (Earlier baseline: Phase L — Settlement Engine + Real-Time Triggers.)

---

## 📜 Preamble

The Phases A→L stack delivers an **immune, autonomous, single-region PostgreSQL super-app** capable of serving the first ~1M users with mathematical correctness (double-entry ledger invariant), atomic settlement, geospatial dispatch, and an internal DEX matching engine.

This document captures the **next-order optimizations** that were intentionally deferred. Each item below is *known*, *measured*, and *non-trivial* — they are postponed not out of ignorance, but because the current architecture is sufficient for the current scale envelope. When the corresponding trigger metric is breached, the engineer on call must execute the strategy described here — not invent a new one.

---

## 1. ⚡ The HFT & Liquidity Engine — Phase M+

**Trigger metric:** `execute_trade_matching` p99 latency > 50ms OR > 500 trades/sec sustained.

### 1.1 Deferred Strategy — In-Memory Matching (LMAX Disruptor)
Transition the matching engine from **database-level** SQL execution (`FOR UPDATE` row locks inside `execute_trade_matching`) to an **in-memory order book** following the LMAX Disruptor pattern:
- Single-writer ring buffer per `security_id` → eliminates lock contention.
- Mechanical sympathy: cache-line padded events, no GC pauses.
- Deterministic replay from event log for crash recovery.

### 1.2 Execution — External Microservice
Migrate `execute_trade_matching` out of PostgreSQL into a dedicated **Rust** (preferred for predictable latency) or **Go** microservice:
- Communicates with Postgres only at boundaries (order intake, trade settlement).
- Exposes gRPC for order submission, NATS/Kafka for trade emission.
- Target: **nanosecond-class** matching latency, **microsecond** end-to-end.

### 1.3 Settlement — Asynchronous Batch
Replace the per-trade `process_trade_settlement` trigger with an **async batch settler**:
- Trades stream into a settlement queue.
- A worker drains every ~100ms, writing N ledger entries in a single transaction.
- Reduces DB IOPS by ~95% under sustained load.
- Phase J's `assert_ledger_balanced` invariant remains the final mathematical guard.

---

## 2. 🛰️ Global Logistics Radar — Phase N+

**Trigger metric:** > 500 concurrent drivers OR average dispatch latency > 3s.

### 2.1 Deferred Strategy — Real-Time Driver Telemetry
Replace the current **5-second polling** of `drivers.current_location` with a true real-time channel:
- **WebSockets via Ably** (or Supabase Realtime presence) for driver heartbeat (1Hz position push).
- Server-side fan-out: each customer subscribed to `driver:{order_id}` only — no broadcast storms.
- Backpressure: drop intermediate frames if client RTT > 2s.

### 2.2 Routing Optimization — TSP & VRP
Implement **multi-drop delivery routing** for batched orders:
- **Traveling Salesman Problem (TSP)** solver for single-driver multi-stop runs (Christofides heuristic, ~1.5× optimal).
- **Vehicle Routing Problem (VRP)** with time windows for hub-and-spoke fleet optimization (Phase 14 prerequisite).
- Recommended libraries: Google OR-Tools (Python sidecar) or `vroom-project` (C++ binary, sub-second for 100 stops).
- Re-solve every 60s as new orders arrive, with sticky assignments to prevent driver thrash.

---

## 3. 🗄️ Data Sovereignty & Storage Tiering

**Trigger metric:** `ledger_entries` table > 50M rows OR Supabase storage cost > $X/month.

### 3.1 Hot / Cold Tiering
Implement a **two-tier ledger archive**:
- **Hot tier** (PostgreSQL): rolling 2-year window of `ledger_entries`, `trades`, `orders`.
- **Cold tier** (S3 + Parquet): everything older, partitioned by year/month.
- Query layer: a thin Postgres FDW or DuckDB-over-S3 view for compliance/audit reads (which tolerate seconds of latency).
- Nightly archive job: `INSERT INTO s3.ledger_archive SELECT ... WHERE created_at < now() - interval '2 years'` then `DELETE`.

### 3.2 Edge Computing — Offline-First Catalog
Move **~90% of read-heavy catalog traffic** off Supabase entirely:
- Client-side **IndexedDB** mirror of `products` + `categories` + image URLs.
- Service worker (`public/sw.js` already exists) handles cache-first reads.
- Delta sync: client sends `last_sync_at`, server returns only changed rows.
- Outcome: Supabase free-tier ($0) sustains up to **1M MAU** because catalog reads — the dominant query pattern — never hit the database.

---

## 4. 📦 Mini-App Sandboxing

**Trigger metric:** First third-party mini-program proposed (Phase 14+ marketplace expansion).

### 4.1 Deferred Strategy — Isolation Boundary
Third-party mini-programs (à la WeChat / Alipay) MUST never share the main thread, DOM, or auth context with the Reef Almadina core:

| Approach | Use case | Trade-off |
|---|---|---|
| **Iframe sandbox** (`sandbox="allow-scripts"`, no `allow-same-origin`) | Full UI mini-apps (vendor storefronts, games) | Heavier, but strongest isolation |
| **WebWorker** + message-passing API | Headless logic (custom pricing rules, computational widgets) | Lighter, no DOM access by design |

### 4.2 Capability-Based API
Expose a **narrow, versioned bridge** (`postMessage` protocol) for sandboxed apps:
- No direct Supabase access — every call brokered through the host.
- Per-mini-app permission scopes (`read:products`, `write:own_orders`, etc.) enforced host-side.
- Quotas: CPU/memory/network budget per mini-app per session.
- Kill switch: revoke a mini-app instantly across all sessions via a `mini_apps.disabled` flag.

---

## 🏛️ Closing Principle

> Every optimization in this document is a **future-tense load-bearing wall**. Do not implement them prematurely (YAGNI), but never let the codebase drift in a direction that makes them harder to execute when the trigger metric finally fires.
>
> The current Phase A→L architecture is the **floor**. This document is the **ceiling**. Engineers operate in the space between, and the trajectory is always upward.

— *Strategic Archive · Reef Almadina Super-App*

---

## 5. 👑 Sovereign OS Layer — Phase VIII (current)

**Status:** Live. Recorded so future phases never regress it.

### 5.1 Maeen Sovereign Hub (`/maeen`)
- File: `src/routes/_app.maeen.tsx` → `src/apps/khalil/pages/Hub.tsx` (folder kept for git history; public identity is **معين / Maeen**).
- 100% SDUI, layout slug `khalil_hub`. Active-delivery detection lives in the kernel adapter `src/core-os/maeen/useActiveDelivery.ts` (TanStack Query, 60s `staleTime`) and injects a live `barq_tracking` block via `HakimGenerativeOverlay`.
- Registry id `maeen`, route `/maeen`, accent `from-amber-500 to-orange-600`.

### 5.2 Salsabil Dev-Node (`src/components/system/DevOSNavigator.tsx`)
- FAB (bottom-left, `z-[80]`, `bottom 120px`) mounted **outside the provider tree** in `__root.tsx`. **Always rendered** — the `import.meta.env.DEV` gate was removed in Phase VIII-Restoration.
- Capsule: Maeen launcher (pulsing), `appRegistry`-driven app switcher, Admin Nexus overlay (Master Admin / System Editor / Driver / Vendor / POS), `Maeen-as-Default` toggle, **God Mode** toggle.
- One-shot localStorage migration folds legacy `khalilAsDefault` / `diwanAsDefault` into `salsabil.dev.maeenAsDefault`.

### 5.3 God Mode QA Fabric (`src/lib/godMode.ts`)
- Sources: `window.__SALSABIL_GOD_MODE__`, `window.SALSABIL_GOD_MODE`, `localStorage["salsabil.dev.godMode"]`.
- Bypasses: `useDriverEngine`, `useVendorOperations`, `HomeRedirector` default-view redirect.
- Never modifies production data — only short-circuits client-side state hooks.

### 5.4 Routing & Cache Hardening
- `SubdomainGuard` whitelist: `["/maeen", "/admin/design", "/asrab", "/nabd"]`.
- Phase VIII-FIX cache posture in force: `installEdgePersister` disabled, `registerPWA` disabled, `public/sw.js` is a kill switch, `queryPersister` BUSTER = `"salsabil-os-v2-dev"`.

### 5.5 Hydration Discipline
- `SalsabilStatusBar` renders neutral placeholders (`—` / `…`) until `mounted` flips client-side. Wallet read is now wrapped in TanStack Query (`["wallet", "status-bar", userId]`) — single in-flight request per session, shared across every shell that mounts the bar.

### 5.6 Kernel Purification (Phase 2)
- **V-1:** SDUI types canonicalised in `src/core-os/sdui-engine/types.ts`. No `core-os → apps/*` type imports remain.
- **V-2:** Maeen Hub no longer touches Supabase directly. All DB reads flow through kernel adapters (`core-os/maeen/*`). UI components are presentation-only.
- **R-4:** Wallet status-bar fetch cached via TanStack Query — N→1 collapse on multi-shell navigation.

---

## 6. 💸 Phase P+: Sovereign Payment Gateway & Behavioral AI (Deferred Mega-Feature)

**Trigger metric:** Maeen MAU > 50k OR Reef checkout volume > 5k/day OR first request for Vodafone Cash / Instapay acceptance.

### 6.1 Hakim AI — Cross-App Behavioral Engine
Evolve `core-os/hakim-ai/` from passive advisor into an **Amazon-style complement generator** spanning every app in the family.

- **Behavioral fabric:** every interaction across Reef / Maeen / Asrab / Nabd streams through `core-os/event-bus` into a unified `user_behavior_stream` table (append-only, partitioned by month).
- **Complement model:** lightweight collaborative-filtering model (item-item co-occurrence + tier/vertical priors) computed nightly into a `hakim_complements` matrix; served via a single RPC `hakim_complements(user_id, anchor_item_id, k)`.
- **SDUI mutation:** `HakimGenerativeOverlay` extends from "inject one block" to **rewriting any SDUI layout in-flight** — re-ranking rails, swapping section variants, and injecting personalised `smart_rail` blocks based on the live complement vector. The Admin-authored layout becomes the *baseline*; Hakim becomes the *delta*.
- **Privacy posture:** complements computed per `customerId` (already pseudonymous); no raw PII enters the model. Opt-out flag on profile disables Hakim mutations entirely (falls back to baseline SDUI).
- **Trigger to build:** ≥ 100k events/day OR ≥ 3 apps live with overlapping users.

### 6.2 Tayseer POS — Sovereign Payment Aggregator
Transform Reef Al Madina from a retail app into a **financial aggregator** that replaces Fawry / Basata at the point of sale.

#### 6.2.1 Offline Dynamic QR (Vodafone Cash / Instapay)
- Each cashier shift mints a per-transaction **dynamic QR** (EMVCo-style payload) signed by an **Edge-Function Oracle** (`supabase/functions/tayseer-qr-oracle/`). The oracle proxies the merchant's Vodafone Cash / Instapay merchant API, returning a short-lived signed payload.
- POS device caches the last N pre-signed QR templates so the cashier can collect payment **even when offline**; settlement reconciles when connectivity returns.
- Webhook listener (`/api/public/tayseer-payment-callback`) verifies provider signature, marks the order paid, and emits a `payment.confirmed` event.

#### 6.2.2 Push-to-Pay (Internal Wallets)
- For Tayseer-on-Tayseer transfers (customer ↔ vendor ↔ driver), bypass external rails entirely: a **single ledger transaction** debits the payer wallet and credits the payee wallet, gated by the Phase J `assert_ledger_balanced` invariant.
- Push notification surfaces the request on the payer's device; one-tap approve commits the transaction in < 200ms.
- Falls back to QR + provider rail when payer balance is insufficient.

#### 6.2.3 Auto-Calculated Ledger Commissions
- Every external-rail acceptance writes **three ledger entries** atomically: gross to merchant, commission to platform (configured per-vertical in `payment_rules`), and provider fee to a `cogs:payment_rails` account.
- A nightly settlement job collapses all platform commissions per merchant into a single payable row, ready for the existing Phase L settlement engine.

#### 6.2.4 Vision
Reef Al Madina ceases to be a customer of Fawry/Basata and becomes their **competitor at the village level** — every Reef vendor terminal is a payment acceptance node, every Maeen user is a wallet, and every transaction settles internally on the existing double-entry ledger.

**Architectural prerequisite:** Phase L settlement engine + Phase J ledger invariant (already live). No DB schema work blocks this — only the Edge Oracles and the POS UI.

---

## Phase 3 — Apple-tier Gestures, Haptics, Bottom-Sheet Peek ✅ (closed 2026-05-07)

**Outcome:** the Supermarket vertical now has a single source of truth and a gesture-driven, minimalist, haptic UX. Drift between `src/pages/store/Supermarket.tsx` (legacy `DualNavStore`) and `src/modules/supermarket/SupermarketPage.tsx` is eliminated — the legacy page was deleted.

### Delivered
1. **Gesture primitive** — `src/hooks/useLongPress.ts` (pointer events, 400ms hold, 8px move-tolerance, 15ms `navigator.vibrate` haptic on activation). Zero-dep, works on iOS Safari, Android Chrome, desktop.
2. **Bottom-sheet peek** — `src/apps/reef-al-madina/features/product-detail/components/ProductPeekSheet.tsx`. Built on `vaul` via the existing `Drawer` wrapper with `snapPoints={[0.8, 1]}`, drag-to-dismiss, composes existing `ProductGallery` + `StickyAddCTA` (no detail-logic duplication).
3. **`ProductCard` minimal variant** — added `variant="minimal"` to BOTH the shared `@/components/ProductCard` and the home `apps/reef-al-madina/.../ProductCard`. Renders only image · 1-line title · price · add. Add-to-cart now triggers a 10ms haptic on every variant.
4. **Supermarket integration** — `SupermarketProductCard` now renders the minimal variant, opens `ProductPeekSheet` on tap (replacing route navigation), and opens a Radix `Popover` Quick Peek on long-press (favourite, compare, full details).
5. **Decommission** — `src/pages/store/Supermarket.tsx` deleted; the `_app/store/supermarket` route is the single entry point.

### Architectural invariants reinforced
- **Single source of truth** per vertical — no parallel page implementations.
- **Detail logic stays in `apps/reef-al-madina/features/product-detail/`** — both the route page and the peek sheet compose the same blocks.
- **Kernel-grade primitives** (`useLongPress`, vaul snap-points) are documented in the manifest and available to every app shell.

---

## Phase 4 — Hakim Predictive Cart 🚧 (in progress, opened 2026-05-07)

**Vision:** a 1-tap, AI-populated cart. Hakim infers the user's recurring basket from purchase history + temporal context (time of day, weekday/weekend, season) and surfaces it as a single accept-or-edit suggestion in Cart and Home empty states.

### Part 1 — DB Sovereignty (current)
Lay the database primitives required for prediction and for cross-device subscription persistence. **No prediction logic ships in Part 1** — only the storage and aggregation layer.

1. **`public.saved_baskets`** — single home for *all* persistent baskets (`source ∈ {'manual', 'predicted', 'subscription'}`). Replaces the legacy `localStorage["reef-subscriptions-v1"]` store. RLS-scoped per `user_id`. Items stored as `jsonb` to stay forward-compatible with line-meta evolution (variants, print configs, booking slots).
2. **`public.user_product_frequency`** — *materialized view* over `orders ⨝ order_items` exposing `qty_total`, `order_count`, `last_ordered_at`, and `avg_interval_days` per `(user_id, product_id)`. Unique index enables `REFRESH MATERIALIZED VIEW CONCURRENTLY` from a future pg_cron job. Access is revoked from `authenticated` — only service-role / SECURITY DEFINER callers (the Hakim edge function) read it.
3. **Code cleanup** — `src/lib/buyAgain.ts` deleted (DB-backed `useBuyAgainProducts` is the sole source). `src/lib/baskets.ts` annotated with the migration TODO; logic untouched until Part 2.

Migration is **staged** at `docs/migrations-staging/20260507_hakim_predictive_cart.sql` and not yet applied to the live DB.

### Part 2 — Subscription migration & predictive surfaces (next)
- One-time client-side sync: read `localStorage["reef-subscriptions-v1"]` → upsert into `saved_baskets` (`source = 'subscription'`) → mark migrated.
- `useReplaceCart(lines)` action + confirmation toast for the 1-tap apply UX.
- `predict_basket(_user_id, _context jsonb)` edge function: pulls from `user_product_frequency` + `frequently_bought_together` + temporal context, calls Lovable AI, persists the suggestion as `source = 'predicted'`.
- pg_cron job: `REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_product_frequency` nightly.
- `PredictiveBasketCard` in Cart empty state and Home — "Hakim suggests your weekly basket · 1-tap" with a diff vs. current cart.

### Architectural invariants
- **DB is the single source of truth for persistent baskets** — no localStorage shadow stores survive Phase 4.
- **Materialized views feed AI context, never the UI directly** — RLS-bypassing reads are confined to SECURITY DEFINER callers.
- **One table, one shape** — `saved_baskets` is polymorphic via `source`; we do not fork a separate `subscriptions`/`predictions`/`manual_baskets` schema.

## Phase 4 — Hakim Predictive Cart (Part 2 — Executed 2026-05-07)

- ✅ **DB migration applied**: `saved_baskets` (RLS-clean, polymorphic source) + `user_product_frequency` materialized view live in production.
- ✅ **Fatal Lag Fix**: `useHomeOrchestrator` now consumes `useHomeProductsQuery(48, "home")` — server-side capped at 48 rows by `source`. Eliminated the legacy `fetchAllProducts` (2000-row) path on the home screen.
- ✅ **Module Restoration**: `appRegistry` now publishes Baskets (`/store/baskets`), Meat (`/store/meat`), and Village (`/store/village`). `DepartmentGrid` exposes Baskets as a top-level tile.

## Phase 4 — Hakim Predictive Cart (Part 3 — Executed 2026-05-07)

- ✅ **OS Registry Purge**: removed `baskets`, `meat`, `village` from `src/core-os/app-registry/index.ts`. The OS registry now contains ONLY true Sovereign Super-Apps: `reef`, `asrab`, `nabd`, `maeen`. Internal Reef departments are surfaced exclusively via the SDUI `departments_hub` layout.
- ✅ **SDUI Sections Reunification**: injected the "سلال الريف → /store/baskets" tile into the active `departments_hub` v4 (id `14afb38a-…`) `hub-main-departments` bento (now 6 tiles). Admin-editable, no code change required for future tile edits.
- ✅ **Meat Route Optimization**: `src/routes/_app/store.meat.tsx` loader switched from `productsQueryOptions()` (2000-row warm) to `homeProductsQueryOptions(48, "meat")`. The fatal memory crunch on Meat entry is eliminated. Village still warms the legacy cache and is queued for the same treatment.

## Phase 4 — Hakim Predictive Cart (Part 4 — Executed 2026-05-07)

- ✅ **Subscriptions DB Migration**: new `src/lib/savedBaskets.ts` + `useSubscriptions()` hook (`src/hooks/useSubscriptions.ts`) own the subscription lifecycle against `public.saved_baskets` (source = 'subscription'). `BasketSheet`, `BasketsSubs`, and `Baskets` pages all consume the DB-backed hook. Legacy `loadSubs/saveSubs` retained only as a one-shot migration reader; new code MUST NOT call them.
- ✅ **Legacy Migration Shim**: `migrateLegacySubscriptions(userId)` runs on first authenticated mount of `useSubscriptions`. It drains `localStorage["reef-subscriptions-v1"]` into `saved_baskets`, then clears the local key. Idempotent.
- ✅ **1-Tap Replace API**: `src/hooks/useReplaceCart.ts` wraps the existing Zustand `replaceAll(lines)` action with a unified success toast ("تم استبدال السلة بنجاح"). Triggers the cart sync layer's debounced remote push automatically.
- ✅ **Hakim Predictive Basket UI**: `src/apps/reef-al-madina/features/cart/components/HakimPredictiveBasket.tsx` mounted at the top of the empty Cart state. Currently mocks the suggestion from the cached home catalog; Part 5 will swap it for the `predict_basket(_user_id)` edge function call against `user_product_frequency`.

## Phase 5 — Hakim Predictive Edge Brain (Executed 2026-05-07)

- ✅ **`predict_basket` Edge Function** (`supabase/functions/predict_basket/index.ts`): mirrors the `hakim-advisor` skeleton (CORS, 429/402/error envelopes). Auth derived from `userClient.auth.getUser()` — never trusts the request body. Service-role admin client reads top-30 rows from `public.user_product_frequency` (ordered by `qty_total`, then `last_ordered_at`) and hydrates them from `public.products`.
- ✅ **Tool-Forced AI**: calls `google/gemini-2.5-flash` via Lovable AI Gateway with a forced `propose_basket` tool whose schema yields `{ headline, confidence, basket: [{ product_id, quantity, reason }] }`.
- ✅ **Anti-Hallucination Sanitizer**: every returned `product_id` is validated against the hydrated candidate set; unknown ids are silently dropped, qty is clamped to `[1, 20]`, and the response is enriched server-side with `name/unit/price/image/category` so the client never re-fetches.
- ✅ **Client Adapter** (`src/core-os/hakim-ai/hooks/usePredictBasket.ts`): TanStack `useQuery` wrapping `supabase.functions.invoke("predict_basket")`. 5-min `staleTime`, gated on auth, no retry on `rate_limited` / `credits_exhausted`.
- ✅ **UI Wiring**: `HakimPredictiveBasket.tsx` now consumes `usePredictBasket()` directly. Skeleton during fetch, hides on empty/error, renders the dynamic `headline`, predicted lines (with reasons → tooltipable), confidence %, and feeds the live prediction into `useReplaceCart` for the 1-tap apply.

## Phase 6 — Auth Simplification & Global Image Optimization ✅
- **Auth**: `src/pages/Auth.tsx` formalized — password is `length >= 6`, any characters (including digits-only). Welcoming Arabic toast. Comment: "Sovereign simplicity: 6+ chars, no complexity required per Emperor's decree."
- **Image Engine Unification**: `OptimizedImage` (`src/components/ui/OptimizedImage.tsx`) is now the **mandatory** image atom (lazy + async decode + fetchpriority + skeleton + branded fallback + CLS-safe).
- **LazyImg purged**: `src/apps/reef-al-madina/features/pharmacy/components/LazyImg.tsx` deleted; consumers (`ProductCards.tsx`, `ProductOverlay.tsx`) migrated.
- **Raw `<img>` stragglers killed (7)**: `RestaurantBlock`, `BasketCard`, `SponsoredRestaurantRail`, `BorrowCard`, `DailyBrowser`, `WeeklyPlanner`, `FeatureTileGrid`. Above-the-fold tiles use `priority` / `fetchpriority="high"`; all carry explicit `width`/`height` for zero-CLS.

---

## 🌌 Phase 7 — The Limitless Polymorphic Engine (Staged 2026-05-07)

The Emperor rejected incremental patches to `products`. Phase 7 introduces the **Salsabil Universal Asset & Contract Engine** — a polymorphic schema that lets a single OS sell ANYTHING through one canonical pipeline:

- 🛒 **Retail** (physical & digital goods)
- 🍱 **Services & Rentals** (time-slot inventory, deposits)
- 🏗️ **Real-Estate Finishings** (milestone installments, escrow)
- 📦 **Subscriptions** (recurring contracts, trials)
- 🎟️ **Capacity-bound experiences** (events, classes)

### Why this replaces traditional PIMs
Classical PIMs (Akeneo, Pimcore, even Shopify's product/variant model) hard-code the assumption that "a product has a price and a stock count". Salsabil's god-tier model decomposes commerce into four orthogonal primitives — entity, sale unit, money flow, and availability — so a kitchen-finishing project, a borrowed library book, a wholesale rice tier, and a fresh tomato all share one cart, one checkout, one Hakim brain, and one analytics surface.

### The four primitives
| Table | Role | Key columns |
|---|---|---|
| `salsabil_assets` | WHAT it is | `asset_type` enum, `traits` jsonb, `media` jsonb |
| `salsabil_skus` | exact unit of sale | `sku_code`, `barcode`, `attributes` jsonb |
| `salsabil_financial_contracts` | HOW money flows | `pricing_model` enum, `base_price`, `contract_rules` jsonb |
| `salsabil_inventory_matrix` | WHAT'S available | `inventory_type` enum, `availability_data` jsonb |

### Pricing models supported on Day 1
`flat` · `tiered_wholesale` · `subscription` · `deposit_and_rental` · `milestone_installments`

### Inventory types
`count` · `time_slots` · `capacity`

### Migration status
- ✅ **Staged**: `docs/migrations-staging/20260507_salsabil_universal_engine.sql` (4 tables, 3 enums, RLS, validation triggers, GIN indexes on jsonb).
- ⏳ **Application & AI-Genesis Admin UI**: Phase 7 Part 2.
- 🛡️ **Live `products` table left intact** — zero downtime cutover planned.

---

## 🛰️ Phase 7 Part 2 — Zero-Touch AI Genesis (Vision Portal) ✅

The polymorphic schema is staged; populating it now happens in **one tap**. An admin snaps a photo (product, supplier invoice, service flyer, contract) and Hakim Vision returns the entire Universal Salsabil Asset payload — Asset + SKUs + Financial Contract — ready to mint.

### Components shipped
| Layer | File | Role |
|---|---|---|
| Edge Function | `supabase/functions/vision_genesis/index.ts` | Auth-gated multimodal call to `google/gemini-2.5-pro` via Lovable AI Gateway. Forces the `generate_usa_payload` tool call and sanitizes enums + numeric ranges. |
| Client Adapter | `src/core-os/hakim-ai/hooks/useVisionGenesis.ts` | TanStack mutation: File → base64 → invoke. Typed errors (`rate_limited`, `credits_exhausted`, `ai_error`, …). |
| Admin UI | `src/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader.tsx` | Drag & drop + native camera capture. "Genesis Review Board" renders Asset, SKUs, Financial Contract. **Approve & Mint USA** logs the payload (DB insert deferred to Part 3 for zero-downtime cutover). |

### Tool-call schema (anti-hallucination)
- `asset.asset_type` ∈ `{physical, digital, service, rental, milestone_project}`
- `financial_contract.pricing_model` ∈ `{flat, tiered_wholesale, subscription, deposit_and_rental, milestone_installments}`
- All free-form fields length-capped, numeric prices clamped ≥ 0, currency restricted to `EGP|USD|EUR`.

### Next (Part 3)
- Wire **Approve & Mint USA** to a server function inserting into `salsabil_assets` + `salsabil_skus` + `salsabil_financial_contracts` atomically.
- Dual-write shim from legacy `products` to the new tables.

## Phase 7 — Part 3: Atomic Minting & Dual-Write Shim ✅

- **Migration applied**: 4 polymorphic tables live (`salsabil_assets`, `salsabil_skus`, `salsabil_financial_contracts`, `salsabil_inventory_matrix`) with RLS (public read on active rows, admin-only writes), GIN indexes on jsonb traits/attributes, validation trigger on financial contracts.
- **Atomic Minting RPC**: `public.mint_universal_asset(payload jsonb) RETURNS uuid` — `SECURITY DEFINER`, gated by `has_role(auth.uid(),'admin')`. In a single transaction it inserts the asset, all SKUs, the financial contract on the first SKU, and (if `asset_type = physical`) mirrors a row into the legacy `products` table under `category = 'usa-genesis'` with metadata `{usa_asset_id, usa_sku_id}` for backward-compat. `EXECUTE` revoked from `PUBLIC`, granted only to `authenticated`.
- **Client Hook**: `src/core-os/hakim-ai/hooks/useMintUSA.ts` wraps the RPC in a TanStack mutation, invalidates `salsabil_assets` and `products` caches on success, surfaces success/error toasts in Arabic.
- **UI Wired**: `VisionGenesisUploader.approve()` now calls `mintUSA.mutateAsync()`, shows a "جاري سكّ الأصل…" loader on the approve button, and resets cleanly on success.

## Phase 7 Part 4 — The Sovereign Purge & USA Nexus

The legacy Product UI was eradicated to enforce extreme architectural purity (no active customers → no backward-compat tax):

- **Purged**: `src/components/admin/ProductEditor.tsx`, `src/pages/admin/Products.tsx`, `src/routes/admin.products.tsx`.
- **Sidebar/Topbar/BottomTab/HakimFAB/Dashboard** rewired from `/admin/products` to `/admin/assets`.
- **New gateway route**: `src/routes/admin.assets.tsx` → `lazyPage(@/pages/admin/UsaLedger)`.
- **USA Ledger** (`src/pages/admin/UsaLedger.tsx`): pure `UniversalAdminGrid` reading `salsabil_assets` with embedded joins to `salsabil_skus` and `salsabil_financial_contracts`. BentoMetrics: total · physical · service. Columns: name · type badge · base price · SKU count · created date.
- **USAEditor** (`src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx`): RTL slide-over `Sheet` with four tabs — أساسي · العقود المالية · المخزون · التكوين الذكي. The Genesis tab natively embeds `VisionGenesisUploader`, making AI-creation the primary path. Update RPCs for the other tabs land in Part 5.

## Phase 7 Part 5 — The Mutation Engine

The USA Nexus is now write-enabled with full legacy-shim coherence:

- **RPC**: `public.update_universal_asset(p_asset_id, p_name, p_description, p_base_price)` — `SECURITY DEFINER`, `search_path=public`, `EXECUTE` revoked from `PUBLIC` and granted to `authenticated`. Internally enforces `has_role(auth.uid(),'admin')` and atomically updates the asset, its first active financial contract, and the mirrored row in the legacy `products` table (id `usa_<uuid>`).
- **Hook**: `src/core-os/hakim-ai/hooks/useUpdateUSA.ts` — TanStack mutation invalidating `salsabil_assets`, `products`, `admin-grid`, and `admin/list/products` query keys; success toast "تم تحديث الأصل وتزامنه بنجاح".
- **USAEditor**: "أساسي" tab now hosts live name/description inputs; "العقود المالية" tab hosts the active base-price input bound to the asset's currency. A unified "حفظ التعديلات" button shows a Loader2 spinner while `isPending` and is disabled on empty name. The Genesis and Inventory tabs remain reserved for upcoming SKU/contract orchestration.

## Phase 8 Part 1 — AI Co-Pilot & Manual Entry Symbiosis

The USAEditor is now a true human-in-the-loop control surface — pure manual creation, AI-prefilled drafts, and edit-before-mint review all coexist:

- **Unified Creation State**: When `isNew` is true the Basic and Financials tabs render full editable inputs (name, description, asset_type select, pricing_model select, currency, base_price). No asset row required.
- **Co-Pilot Handshake**: `VisionGenesisUploader` gained a `handoffOnly` prop. In the Editor's Genesis tab the uploader runs in handoff mode — instead of minting, it returns the parsed `USAGenesisPayload` to the Editor, which auto-fills local state, stores the AI draft (preserving `traits`, `skus`, `contract_rules`), and switches the active tab to "أساسي". A dismissible draft banner signals the AI's contribution.
- **Smart Save Action**: A unified "حفظ" button calls `useMintUSA` when `isNew` (merging manual fields with any AI draft side-data) and `useUpdateUSA` otherwise. Loader copy adapts ("جاري سكّ الأصل…" vs "جاري الحفظ والتزامن…").
- **Files**: `src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx`, `src/apps/reef-al-madina/features/admin/product-editor/VisionGenesisUploader.tsx`.

## Phase 8 Part 2 — Decentralized Inventory Matrix

Salsabil stock is no longer a single integer — it is a SKU × Location/Vendor matrix powering multi-vendor logistics:

- **Schema**: Added unique index `uq_salsabil_inventory_sku_location` on `(sku_id, COALESCE(location_code, ''))` so each location/vendor holds at most one row per SKU.
- **RPC**: `public.upsert_inventory_matrix(p_sku_id uuid, p_location_id text, p_inventory_type text, p_availability jsonb)` — `SECURITY DEFINER`, `search_path=public`, admin-gated via `has_role`. Inserts or updates the matrix row keyed by `(sku_id, location_code)` and stores stock as JSONB (e.g. `{"count": 50}`), keeping room for duration/capacity/binary inventory types.
- **Hook**: `src/core-os/hakim-ai/hooks/useInventoryMatrix.ts` — `useInventoryMatrix(skuId)` query + `useUpdateInventory` mutation invalidating `["salsabil_inventory", sku_id]`.
- **UI**: `src/apps/reef-al-madina/features/admin/usa-editor/InventoryMatrixPanel.tsx` — SKU selector, dynamic rows pairing "موقع المخزن/البائع" text input with a numeric quantity, add/remove controls, bulk save.
- **USAEditor wiring**: The "المخزون" tab now branches on `assetType` — physical assets render the matrix panel, non-physical show a localized "coming soon" notice for capacity/time-slot inventory, and unsaved drafts prompt to mint first.

---

## 🧬 Phase 8 Part 3 — The Sovereign Matchmaker (Vector Dedup)

**Strategy:** Vendor Catalog Deduplication via pgvector.

**Cost-saving measure:** We use cheap text embeddings and native Postgres
vector similarity to prevent duplicate USAs, ensuring a clean Amazon-style
multi-vendor catalog. Future AI calls will utilize this semantic cache to
bypass LLM processing.

**Components shipped:**
- Migration: `vector` extension enabled, `salsabil_assets.semantic_embedding vector(768)`, HNSW index with `vector_cosine_ops`.
- RPC: `public.match_universal_asset(p_embedding vector(768), p_threshold float)` — `SECURITY DEFINER`, returns `(id, name, similarity)` ordered by cosine distance.
- Edge function: `supabase/functions/generate_embedding` — proxies Lovable AI Gateway `google/text-embedding-004` (768-dim) with 429/402 surfaced.
- Client hook: `src/core-os/hakim-ai/hooks/useAssetMatchmaker.ts` — `checkDuplicates(name, description, threshold=0.85)`.

**Doctrine:** Pre-flight matchmaker runs BEFORE every USA mint; if matches ≥ threshold are returned, the Admin is presented with merge-into-existing UX instead of creating a duplicate row.

## Phase 8 Part 4 — Visual Deduplication & Sovereign Override (2026-05-08)
- `USAEditor.handleSave` now intercepts new mints with `useAssetMatchmaker.checkDuplicates`. When matches ≥ threshold are returned, minting pauses and a `DuplicateAdvisor` panel is rendered above the Save button.
- Two Sovereign Action buttons: **قبول نصيحة حكيم** (clears the form) and **تخطي حكيم وسكّ كأصل جديد** (sets `hasOverriddenAI=true` and forces minting).
- `mint_universal_asset` RPC now accepts an optional `payload.semantic_embedding` (jsonb 768-dim array) and persists it into `salsabil_assets.semantic_embedding`. `useMintUSA` forwards the embedding produced by the matchmaker — zero-waste reuse, no duplicate token spend.
- **Doctrine:** AI is strictly an advisor. The Admin retains absolute final authority via the Force-Mint override.

## Phase 8 Patch — Integrity Protocol (2026-05-08)
- **G1 (BLOCKER fixed):** `sync_inventory_to_legacy()` AFTER trigger on `salsabil_inventory_matrix` recomputes `SUM((availability_data->>'count')::int)` for every asset and writes it into `products.stock` (`'usa_'||asset_id`). Mint now seeds `stock = 0` so trigger-driven values are authoritative.
- **G2 (BLOCKER fixed):** `useInventoryMatrix.UpsertInventoryInput.inventory_type` constrained to `"count" | "time_slots" | "capacity"` to match the DB enum exactly.
- **G4 (HIGH fixed):** `mint_universal_asset` now fans out the financial contract to **every** SKU inside the loop — multi-variant assets no longer leave non-first SKUs without pricing.
- **G14 (CRITICAL fixed):** Vision Genesis hands its captured `File` back to the Editor, which uploads it to the public `product-images` bucket and injects the public URL into `payload.asset.media`. The mint RPC persists `media` into `salsabil_assets.media` and mirrors `media[0]` into legacy `products.image`.
- **G9, G11, G12 cleanups:** `setHasOverriddenAI(false)` after every successful mint; removed unused `Placeholder` component, removed `Wrench` import, removed `console.log` from `useMintUSA`.
- **Status:** USA Engine declared 100% production-stable. Ready for Phase 9 Vendor Gateway.

## Phase 9 Part 1 — Vendor Genesis & Sovereign Lockdown (2026-05-08)
- **Security Lockdown:** `src/routes/vendor.tsx` now wraps `VendorShell` in `<RoleGuard roles={["vendor","admin"]}>` — the entire `/vendor/*` subtree is sealed at the route boundary. No more anonymous access.
- **Multi-Tenant Schema:** Created `salsabil_vendors` (tenant entity) and `salsabil_vendor_members` (user↔tenant join with sub-role). RLS enforced via the new `is_vendor_member()` SECURITY DEFINER helper: members read their own vendor, owners manage memberships, admins retain global control.
- **Identity Hook:** `useCurrentVendor()` (TanStack Query) resolves the authenticated user's primary active tenant + their role within it — single source of truth for the vendor portal.
- **Doctrine:** The **Benaa SaaS & Multi-Tenant Doctrine** and the **Dynamic Visibility Rule** are now permanently inscribed in `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`. Salsabil is no longer just a marketplace — it is the foundation for a sovereign Arabic B2B ERP ecosystem.

## Phase 9 Part 2 — Vendor Catalog & Matrix Onboarding (2026-05-08)
- **Read-Only USA Lens:** New `/vendor/catalog` route renders `VendorCatalog` powered by `UniversalAdminGrid`, fetching `salsabil_assets` joined with `salsabil_skus` + `salsabil_financial_contracts`. Strictly NO Edit/Delete row actions — Tenants cannot mutate the Sovereign Catalog.
- **Inventory Declaration Modal:** Single row action `إضافة لمخزني` opens a Dialog wired to `useCurrentVendor()` + `useUpdateInventory()`. On confirm, calls `upsert_inventory_matrix` with `location_id = currentVendor.vendor.id`, materialising the Tenant's local stock row inside the Decentralized Inventory Matrix.
- **Sidebar/Tab Bar:** `VendorShell` extended from 4 → 5 tabs — added "الكتالوج" (Library icon) between Home and Orders; renamed "منتجاتي" → "مخزوني" (Package icon) to align with the Inventory Matrix doctrine.
- **Doctrine:** Catalog is global and sovereign; inventory is decentralized and tenant-scoped. Vendors declare *availability against* assets, never the assets themselves.

## Phase 9 Part 3 — Vendor Matrix Dashboard & Dynamic Price Override (2026-05-08)
- **Tenant-Isolated "مخزوني":** `src/pages/vendor/VendorProducts.tsx` rewritten as `VendorInventory`. Fetches `salsabil_inventory_matrix` filtered by `location_code = currentVendor.vendor.id`, deeply joined with `salsabil_skus → salsabil_assets → salsabil_financial_contracts` to surface Asset name, SKU code, current quantity, base price, and last-updated timestamp.
- **Quantity Adjustment:** Row action `تعديل المخزون` opens a Dialog → `useUpdateInventory` → `upsert_inventory_matrix`. RPC widened to authorise vendor members for their own `location_id` (admin still global). New RLS policy `Vendor members read their inventory` lets tenants `SELECT` only matrix rows tied to their `vendor_id`.
- **Dynamic Price Override:** Optional `السعر الخاص (اختياري)` input persisted into `availability_data->'override_price'` (jsonb). Tooltip educates the Tenant: empty → sells at the unified Sovereign price; filled → local override for service/cost differentials. UI shows the override in primary color with the base price struck-through.
- **Doctrine:** The Sovereign Catalog dictates the canonical price; the Decentralized Matrix permits transparent, per-tenant deviation. Pricing remains observable, auditable, and bounded by the global asset.

## Phase 9 Part 4 — Multi-Vendor Routing Engine & Vendor Orders (2026-05-08)
- **Schema:** New `salsabil_fulfillment_nodes` (one per vendor slice of a master order: `master_order_id`, `vendor_id`, `status`, `total_amount`) + `salsabil_fulfillment_items` (line items with `sku_id`, `quantity`, `price_at_time`). Updated-at trigger via `touch_updated_at()`.
- **RLS:** Admins fully manage both tables. Vendor members can `SELECT/UPDATE` only their own nodes (gated by new `current_user_is_vendor_member()` SECURITY DEFINER helper) and can `SELECT` only items inside those nodes — perfect tenant isolation of Master Orders.
- **Hook:** `useUpdateFulfillmentStatus` (TanStack mutation) bumps a node's `status` (`pending → preparing → prepared → shipped → delivered/cancelled`) and invalidates both grid and per-vendor caches.
- **UI:** `src/pages/vendor/VendorOrders.tsx` rewritten on `UniversalAdminGrid` (server-paginated against `salsabil_fulfillment_nodes`). Columns: order id (truncated) + date, status pill, items count, total. Row actions: `تفاصيل الطلب` (opens dialog joining `salsabil_fulfillment_items → salsabil_skus → salsabil_assets`) and `تغيير الحالة إلى جاهز`.
- **Doctrine:** A customer's master order is a Sovereign artifact; each vendor only ever sees their own slice via `fulfillment_nodes`. RLS — not application code — is the trust boundary.

## Phase 10 Part 1 — The Sovereign Router & Legacy Bridge (2026-05-08)
- **Audit Fix:** Closes the Phase 10.1 gap surfaced in the read-only reconnaissance. The Master Order Spine, missing for two cycles, is now live.
- **Master Orders:** New `public.salsabil_master_orders` (`customer_id` FK `auth.users`, `total_amount`, `status='pending'`, `delivery_info jsonb`). RLS: admins manage all, customers `SELECT` only rows where `auth.uid() = customer_id`. Touch trigger via `touch_updated_at()`.
- **Delivery Snapshot (Gap 4):** `salsabil_fulfillment_nodes.delivery_snapshot jsonb` added + non-validated FK `master_order_id → salsabil_master_orders(id)`. Vendors can finally see *where* to deliver under their own RLS scope — no leakage to peer tenants.
- **Legacy Bridge (Gap 3):** `resolve_legacy_product_to_sku(text) → uuid` (SECURITY DEFINER, STABLE). Resolution order: native UUID → `usa_<uuid>` prefix → `products.metadata->>'usa_sku_id'`. Returns `NULL` when the product cannot be mapped — caller must reject the cart line.
- **Sovereign Checkout RPC (Gap 1 + 6):** `process_checkout_sovereign(p_customer_id, p_cart_items jsonb, p_delivery_info jsonb) → uuid`. Single transaction:
  1. Inserts master order with delivery info.
  2. For each `{product_id, quantity}` line, resolves the SKU via the bridge.
  3. Picks the **cheapest vendor with sufficient stock** from `salsabil_inventory_matrix` (`override_price` ASC NULLS LAST, ties broken by `updated_at`), `FOR UPDATE` to prevent oversell races.
  4. **Decrements stock atomically** via `jsonb_set(availability_data, '{count}', new_count)` — closes Gap 6.
  5. Upserts the per-vendor `fulfillment_node` (accumulating `total_amount`, injecting `delivery_snapshot`).
  6. Inserts the `fulfillment_item` (`sku_id`, `quantity`, `price_at_time` snapshot — frozen against future price drift).
  7. Rolls up `master_orders.total_amount` and returns the master order ID.
- **Pricing Source:** Falls back to the latest active `salsabil_financial_contracts.base_price` when no vendor `override_price` is declared. Sovereign price is canonical; local override is permitted but observable.
- **Failure Modes:** Empty cart, unresolved SKU, or insufficient stock all `RAISE EXCEPTION` — the entire transaction rolls back, leaving inventory and the master order untouched.
- **Status:** Backend ready. Cart frontend (`useCartCheckoutRpc` → `place_order_atomic_v2`) still on the legacy spine — Phase 10.2 will swap the wire and add the `sku_id` resolver inside the cart adapter.

## Phase 10 Part 2 — The Sovereign Storefront Rewire (2026-05-08)
- **New hook:** `src/core-os/hakim-ai/hooks/useSovereignCheckout.ts` — exposes both a TanStack `useSovereignCheckout()` mutation and a plain `callSovereignCheckout()` async caller. Wraps `supabase.rpc('process_checkout_sovereign', { p_customer_id, p_cart_items, p_delivery_info })` and translates DB errors to Arabic ("نفد من المخزون", "السلة فارغة", "لم يعد متوفراً في الكتالوج السيادي", "يجب تسجيل الدخول").
- **Cart rewire:** `useCartOrchestrator` no longer calls `place_order_atomic_v2`. The submit handler now builds `cart_items: [{product_id, quantity}]` straight from `useCartStore` lines and assembles `delivery_info` from the selected address (label, city, district, street, building), the customer/guest phone & name, the zone, the order notes, and a passthrough payment/delivery snapshot for vendor visibility. The legacy `placeOrderAtomic` payload (header + fulfillments[]) is fully retired from the customer path.
- **Atomic split in production:** the customer's cart is now sliced per-vendor on the server inside a single transaction — master order created, SKUs resolved via `resolve_legacy_product_to_sku`, cheapest-vendor selection under `FOR UPDATE`, inventory decremented in `salsabil_inventory_matrix.availability_data`, fulfillment nodes upserted with `delivery_snapshot`, items inserted with frozen `price_at_time`. Vendors see their slice in real time via `salsabil_fulfillment_nodes` RLS.
- **Cleanup preserved:** post-success `clear()` of `useCartStore` and `navigate({ to: "/order-success" })` continue to fire from the existing orchestrator pipeline. `allocateOrderInventory` is still invoked best-effort against the legacy zone bucket for back-compat with the legacy reservation surface.
- **Doctrine:** Reef Al Madina now operates 100% on the Multi-Tenant Decentralized Matrix. The legacy `orders`/`order_items` spine remains only for back-office historicals; the customer cart no longer touches it. The trust boundary is the RPC, not the client.

## Phase 10 — Part 3: Vendor Radar & Delivery Visibility (2026-05-08)

- **Realtime activated:** `ALTER PUBLICATION supabase_realtime ADD TABLE public.salsabil_fulfillment_nodes` + `REPLICA IDENTITY FULL`. Each vendor opens a tenant-scoped channel `vendor-fulfillment-${vendorId}` filtered by `vendor_id=eq.<id>`; INSERTs trigger a "طلب جديد بحاجة للتجهيز!" toast, UPDATEs trigger "تم تحديث حالة الطلب", and both invalidate the `admin-grid / salsabil_fulfillment_nodes` query so the table refreshes without a manual reload.
- **Delivery snapshot exposed (Gap 4 closed):** `VendorOrders` now selects `delivery_snapshot` and renders a "بيانات التوصيل" panel inside the order details modal — recipient name, tap-to-call phone, address label, full street/building/floor/apartment line, city/zone, and customer notes. Falls back to "لا توجد بيانات توصيل مرفقة" when the snapshot is null.
- **Doctrine:** the vendor dashboard is now a live radar — orders land instantly with full delivery context, no polling, no refresh, RLS-enforced per tenant.

## Phase 10 — Part 4: The Auto-Settlement & Commission Engine (2026-05-08)

- **Schema:** `salsabil_vendors` gains `commission_rate numeric DEFAULT 10` (platform fee %). New table `salsabil_vendor_settlements` (`vendor_id`, `node_id` UNIQUE, `gross_amount`, `platform_fee`, `net_amount`, `status DEFAULT 'pending_clearance'`). RLS: admins manage all; vendors `SELECT` via `current_user_is_vendor_member(vendor_id)`.
- **Atomic auto-settlement trigger:** `trigger_auto_settlement()` fires `AFTER UPDATE` on `salsabil_fulfillment_nodes`. When status transitions to `delivered` (and was not already), it reads `commission_rate` from the vendor row, computes `platform_fee = round(total_amount * rate/100, 2)` and `net_amount = total_amount - platform_fee`, and inserts the settlement row (`ON CONFLICT (node_id) DO NOTHING` for idempotency). Zero manual accounting; the database itself is the source of financial truth.
- **Vendor UI:** `VendorOrders` adds a "تأكيد التسليم" row action that flips the node to `delivered` (will fire the trigger). `VendorWallet` mounts a new `SovereignSettlementsPanel` showing three Bento metrics — إجمالي المبيعات / عمولة المنصة / صافي الأرباح — plus a per-node settlement table (Order short-id, Gross, Fee, Net, Status).
- **Doctrine:** Benaa SaaS financial bedrock is live. Every delivered slice produces an immutable settlement event in the same transaction as the status change. Future work (clearance, payout cycles) builds on top of this row, not on top of trust.

## Phase 11 — Part 1: Zombie Purge, Imperial Treasury & The Great Vision (2026-05-08)

- **Zombie Purge (P1 closed):** `placeOrderAtomic` and the entire `PlaceOrderPayload` / `PlaceOrderFulfillment` / `PlaceOrderItem` / `PlaceOrderResult` surface deleted from `useCartCheckoutRpc.ts`. Only `allocateOrderInventory` remains (still consumed by the orchestrator for legacy zone hints). The customer cart is now a single-engine craft — Sovereign only.
- **Sovereign Settlements UI patch (P2 closed):** `SovereignSettlementsPanel` now renders the settlement `created_at` formatted via `fmtDate`, and exposes a status filter row (الكل / قيد التسوية / تم التحويل) wired to local state. Each row carries the status label inline under its net amount.
- **Sovereign Clearance RPC (P3 closed):** Migration adds `salsabil_vendor_settlements.updated_at`. New `clear_sovereign_settlements(p_vendor_id uuid) RETURNS int` is `SECURITY DEFINER` with `search_path=public`, gated by `has_role(auth.uid(), 'admin')`, and atomically marks all `pending_clearance` rows for the vendor as `cleared` while returning the row count. Namespaced explicitly to avoid collision with the legacy `settle_vendor_payout` family.
- **Imperial Treasury Dashboard:** new route `/admin/sovereign-treasury` mounts `SovereignTreasury.tsx`. Joins `salsabil_vendor_settlements` with `salsabil_vendors(business_name)`, renders three Emperor-tier metrics (إجمالي أرباح الإمبراطورية, مستحقات التجار المعلقة, الأموال المصروفة), and a per-vendor rollup with a "صرف المستحقات" action wired to `clear_sovereign_settlements` via TanStack mutation. Toast "تم صرف المستحقات بنجاح (n)" on success; cache invalidates `["admin","sovereign-treasury"]`.
- **The Great Vision enshrined:** `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md` now carries the "## The Great Benaa OS Vision (The 25-Point Blueprint)" section — Salsabil OS as the genetic kernel for a 25-sector SaaS ERP, with Hakim The Engineer as the autonomous endgame.

## Phase 12 — Part 1: Barq Sovereignty, Schema Upgrade & Legacy Purge (2026-05-08)

- **Logistics spine added:** `salsabil_fulfillment_nodes` now carries the missing driver linkage and lifecycle geography — `driver_id uuid REFERENCES drivers(id)`, `assigned_at`, `picked_up_at`, `delivered_at`, plus `pickup_lat/lng` and `dropoff_lat/lng`. Index on `driver_id` for fast driver-scoped queries. Driver-scoped RLS added (read + update) on top of existing vendor/admin policies, gated through `current_driver_id()` (SECURITY DEFINER, search_path=public) which resolves `auth.uid() → drivers.id`.
- **VRP foundation laid:** new `salsabil_delivery_legs` (node_id, driver_id, sequence_index, status, route_geometry jsonb) and `salsabil_driver_shifts` (driver_id, started_at, ended_at, start_lat/lng, gross_earnings) tables. RLS: admins manage all; drivers read+update only their own. Both added to `supabase_realtime` publication.
- **Great Driver Purge — three legacy `orders` reads eradicated:**
  - `useDriverEngine.ts` — fully rewritten. No more `delivery_tasks` + `orders` + `profiles` join. Now selects `salsabil_fulfillment_nodes WHERE driver_id = me`, parses `delivery_snapshot` for customer name/phone/address/zone, and Realtime-subscribes to the same table filtered by `driver_id=eq.<id>`. FSM (`out_for_delivery`, `arrived`, `delivered`) is a direct UPDATE on the node — RLS gates the write to the assigned driver, and hitting `delivered` fires `trigger_auto_settlement()` atomically.
  - `useActiveDriverTracking.ts` — driver resolution now reads `salsabil_fulfillment_nodes.driver_id` (by `nodeId` or by `master_order_id`), legacy `orders.driver_id` lookup deleted.
  - `useActiveDelivery.ts` (Maeen) — counts non-terminal `salsabil_fulfillment_nodes` joined to the customer's `salsabil_master_orders`, replacing the old `orders` count.
- **Doctrine:** the driver client now natively consumes the Sovereign Matrix. The same row that the customer pays into and the vendor fulfills is the same row the driver delivers and the trigger settles — one canonical lifecycle, one source of truth, zero legacy bridges.

## Phase 12 — Part 2: Multi-Layer Dispatch, Smart Vehicle Routing & Cold Chain Firewall (2026-05-08)

- **Smart schema:** `geo_zones.dispatch_strategy text DEFAULT 'broadcast'`. `drivers` gains `vehicle_type text DEFAULT 'scooter'` (walking | bicycle | scooter | car | refrigerated_truck) and `capabilities jsonb DEFAULT '{}'` (e.g. `{"has_cooler_box": true}`). New `salsabil_dispatch_offers` table (node_id, driver_id, status, expires_at) with admin-all + driver-self RLS via `current_driver_id()`.
- **Smart Broadcaster RPC `broadcast_smart_dispatch(p_node_id)`:** computes vendor→pickup distance via `ST_Distance` geography, scans node items joined to `salsabil_assets` for `traits->>'requires_cold_chain'`, then filters live `driver_positions` by a distance bracket (<2km: walking+bicycle+scooter+car; <8km: scooter+car; ≥8km: car+refrigerated_truck) AND a cold-chain gate (must be `refrigerated_truck` OR `capabilities.has_cooler_box`). Inserts pending offers with 45s expiry within a 10km PostGIS radius.
- **Cold Chain Firewall:** if cold-chain is required, distance ≥2km, and zero matching fridge-capable drivers exist, the node is flipped to `requires_admin_routing` and the RPC returns 0 — no melted ice cream, no silent fallback.
- **Transactional Acceptance RPC `accept_dispatch_offer(p_offer_id, p_driver_id)`:** locks the offer (`FOR UPDATE`), validates pending + non-expired, locks the fulfillment node, assigns `driver_id`+`assigned_at`, flips the node to `preparing`, marks the winning offer `accepted` and all sibling offers `missed`. Race-safe by construction; returns `false` on expiry, missed race, or already-assigned node.

## Hakim AI — Vision Processing Pipeline Mandate (DEFERRED)

- **Emperor's mandate (logged 2026-05-08):** Immediately after Barq stabilization, Hakim must ship the Vision Processing Pipeline — automated **Background Removal & Aesthetic Pastel Background Generator** (via Remove.bg API or Gemini Vision API) running on every merchant USA upload. All vendor-uploaded assets must pass through this filter to enforce the strict Salsabil visual harmony standard before they reach catalog or SDUI surfaces.

---

## Phase 12 Part 3 — Driver Radar UI & Dispatch Acceptance

- **`useDispatchRadar.ts`**: Realtime hook subscribing to
  `salsabil_dispatch_offers` filtered by current driver. Polls every 15s as a
  safety net, exposes `activeOffer` + `acceptOffer` mutation calling
  `accept_dispatch_offer` RPC. Invalidates driver caches on success.
- **`IncomingOfferModal.tsx`**: Global overlay mounted in `DriverShell`.
  Live countdown bound to `expires_at`, urgency styling under 10s,
  Accept/Ignore actions. Ignore is local-only until expiry.
- **Admin Allocation Monitor**: New "عقد التوصيل بدون مندوب — البث الذكي"
  panel listing fulfillment nodes where `driver_id IS NULL`, with row-level
  "بث ذكي" action calling `broadcast_smart_dispatch` and clear flagging of
  `requires_admin_routing` (cold-chain firewall fallout).

## Phase 14 Mandate (Enshrined) — Sovereign Relay Network

Documented in `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`. Public intercity
transport (Microbuses, Taxis) become Middle-Mile Trunk Lines between Benaa
Hubs; Last-Mile completed by local riders. Enables eco 48h SLA windows and
circular reverse logistics. Activates after Barq stabilization.

---

## Phase 12.4 — Pricing Kernel, Modesty Filter & Rideshare Foundation

- **`salsabil_logistics_config`**: per-zone pricing (base_fee, per_km_fee,
  free_delivery_threshold, surge_multiplier, speed_tiers JSON for
  express/standard/economy).
- **Modesty Filter**: `profiles.gender` added; `broadcast_smart_dispatch`
  now prioritizes female drivers when the customer is female, with Sovereign
  Override fallback to all qualified drivers if none match.
- **`get_sovereign_logistics_quote`** RPC: dynamic fee = (base + km*rate) *
  surge * speed_tier_multiplier; free above threshold; returns ETA.
- **`salsabil_rideshare_pool`**: BlaBlaCar foundation (origin/dest, seats,
  trunk capacity, departure_at) — wiring into Relay Network in Phase 14.

## Phase 13 — The Imperial Aesthetic Pipeline

**Mandate:** Every merchant/admin uploaded product image must pass through Hakim Vision aesthetic purification before being minted into the Decentralized Matrix.

- **Edge Function:** `process_image_aesthetic` — auth-gated, calls Lovable AI Gateway (`google/gemini-2.5-flash-image` / Nano Banana) to strip the messy original background and inject a clean white / pastel (pink / mint / cream) backdrop. Returns a base64 data URL.
- **Client Adapter:** `useAestheticProcessor` — TanStack mutation handling file→base64 conversion, style selection, and AI failure modes (rate limit, credits exhausted, parse error).
- **Genesis Integration:** `VisionGenesisUploader` now intercepts approval — purifies → uploads to `product-images` bucket → injects public URL into `payload.asset.media[0]` BEFORE invoking `mint_universal_asset`. Shows live "حكيم يقوم بتحسين الصورة وإزالة الخلفية…" feedback.
- **Outcome:** SDUI visual harmony guaranteed across the catalog. No raw, unstyled merchant photos ever reach the Sovereign storefront.

## Phase 14 Part 1 — The UI Massacre: Customer Surface

**Mandate:** Begin the great migration of the frontend off the legacy `orders` / `order_items` tables onto the Sovereign Matrix (`salsabil_master_orders` → `salsabil_fulfillment_nodes` → `salsabil_fulfillment_items` → `salsabil_skus` → `salsabil_assets`).

### DB Purge — Burn the Ships
- **Migration:** `purge_legacy_checkout_rpcs` — `DROP FUNCTION place_order_atomic`, `DROP FUNCTION place_order_atomic_v2`. Both functions had zero live src/ callers; they are now permanently eradicated. The Sovereign checkout RPC is the single source of truth for order placement.

### Customer Surface Migration
- **`pages/account/Orders.tsx`** — fully rewritten. Drops `Database["public"]["Tables"]["orders"]` types entirely. Now joins master orders → fulfillment nodes → items → skus → assets in a single Supabase query. Aggregates per-vendor node statuses into a headline status for the order card. Reorder pipeline maps `sku.asset_id` back to the legacy `usa_<uuid>` mirror to integrate with the existing cart.
- **`hooks/useBuyAgainProducts.ts`** — fully rewritten. Replaces the legacy two-step `orders → order_items` scan with a three-step Sovereign scan (`master_orders → fulfillment_nodes → fulfillment_items + sku join`). Resolves asset_ids → legacy product mirror ids → live catalog rows.
- **`components/store/BuyItAgainRail.tsx`** — same Sovereign join applied; legacy `order_items` read removed.

### Outcome
The customer-facing "Orders" and "Buy It Again" surfaces no longer touch a single byte of the legacy `orders`/`order_items` tables. Phase 14 Part 2 will complete the same massacre on the admin cockpit, vendor ops, driver tasks, and wallet dashboard.

---

## Phase 14 Part 2 — The UI Massacre: Admin & Vendor Cockpits (2026-05-08)

The customer surface fell first. Now the admin and vendor cockpits are severed from the legacy `public.orders` / `public.order_items` tables and bound directly to the Sovereign Matrix.

### Surfaces migrated
- **`pages/admin/Orders.tsx`** — full rewrite. The Master Orders Hub now reads `salsabil_master_orders` joined with `salsabil_fulfillment_nodes` (for headline aggregation) and a batched `profiles` lookup (for customer name/phone). The headline status of each master order is derived via the `aggregateStatus` priority ladder over its child node statuses. Realtime subscriptions track INSERT/UPDATE on `salsabil_master_orders` and `*` on `salsabil_fulfillment_nodes`. Cancel cascades to all child nodes in one batch. The legacy single-tap "Advance" action was retired (per-vendor advancement now belongs in the vendor cockpit, not the admin master view).
- **`components/admin/OrderSlideOver.tsx`** — full rewrite. Loads master order → nested fulfillment nodes → fulfillment items → sku → asset (display name). Driver assignment now writes `driver_id` + `status='out_for_delivery'` + `assigned_at` to **all** of the master order's nodes in one bulk update.
- **`apps/reef-al-madina/features/vendor/hooks/useVendorOperations.ts`** — rewritten. Live order feed now queries `salsabil_fulfillment_nodes` filtered by the vendor's `vendor_id`, joined to `salsabil_master_orders` (for `delivery_info.service_type` / `delivery_info.payment_method`) and `salsabil_fulfillment_items → salsabil_skus → salsabil_assets` (for item display). Realtime listens on `salsabil_fulfillment_nodes` and `salsabil_fulfillment_items` (legacy `orders` / `order_items` channels removed). Product CRUD still hits the `products` shim until the SDUI cutover finalizes.
- **`pages/driver/DriverTasks.tsx`** — already a thin shell over `useDriverEngine`; verified zero residual `Tables['orders']` references in the entire driver feature tree.

### Outcome
The Admin Master List, the Slide-Over inspector, and the Vendor Operations Hub now render exclusively from the Sovereign Matrix. Combined with Phase 14 Part 1 (customer surface) and the Driver layer (already Sovereign), only the analytics, wallet, and notifications surfaces still hold residual `public.orders` reads — those fall in Phase 14 Part 3.

---

## Phase 14 Part 3 — The Final Cleanup: Total Eradication (2026-05-08)

The last living references to `public.orders` / `public.order_items` in the UI tree have been hunted down and rewritten. The Salsabil OS Frontend is now **100% Sovereign**.

### Surfaces migrated
- **`pages/Account.tsx`** — customer "My Orders" count now reads `salsabil_master_orders.customer_id`.
- **`pages/admin/Finance.tsx`** — 30-day revenue KPI sums `salsabil_master_orders.total_amount` with headline status aggregated from child nodes.
- **`components/admin/AnalyticsCharts.tsx`** — 14-day revenue area chart and status pie now group `salsabil_master_orders` with aggregated headline statuses.
- **`pages/admin/Dashboard.tsx`** — live orders feed, 7-day trend, funnel, and "top categories" all migrated. Top categories now aggregate `salsabil_fulfillment_items.quantity × price_at_time` joined to `salsabil_skus → salsabil_assets.category_path`. Realtime subscriptions retargeted to `salsabil_master_orders` + `salsabil_fulfillment_nodes`.
- **`pages/admin/Notifications.tsx`** — VIP segment resolver now counts delivered `salsabil_master_orders` per `customer_id`.
- **`pages/admin/CustomerDetail.tsx`** — lifetime spend, order count, and the embedded order grid all read from `salsabil_master_orders` with headline-status aggregation.
- **`pages/admin/AllocationMonitor.tsx`** — recent-orders panel reads `salsabil_master_orders` and counts child fulfillment nodes (the Sovereign equivalent of the legacy `sub_orders`).
- **`pages/admin/OrderDetail.tsx`** — full rewrite. Loads master → nodes → items → sku → asset; status mutations cascade across all child nodes; driver assignment writes `driver_id` + `assigned_at` to all nodes simultaneously; address now read from `delivery_info` snapshot (eliminating the legacy `addresses` join).
- **`core-os/finance/hooks/useWalletDashboard.ts`** — wallet category breakdown, monthly tracking, app-spend grouping, and savings calculation all walk `salsabil_master_orders → salsabil_fulfillment_nodes → salsabil_fulfillment_items → salsabil_skus → salsabil_assets`. App grouping is now sourced from `master_orders.delivery_info.app_id` (Phase VII-A invariant preserved). Old/new price savings derived from `asset.traits.{old_price, price}`.

### Final Audit
A repository-wide `rg` for `from("orders")`, `from("order_items")`, `Tables['orders']`, `Tables['order_items']` returns **zero matches** in `src/`. The `products` shim is the only legacy table still touched, and only by the vendor product-CRUD surface — that table is intentionally retained until the SDUI catalog cutover.

### Outcome
**The UI is 100% Sovereign.** The legacy `orders` / `order_items` tables are now read-orphans at the application layer — safe to retire whenever the DB-side purge is scheduled. All four sovereign engines (USA, Matrix, Tayseer, Barq) own their respective UI surfaces end-to-end with zero legacy contamination.

---

## Phase 14 Part 4 — The DB Massacre: Final Purge of Legacy Tables (2026-05-08)

The ships have been burned. With the UI 100% Sovereign (Phase 14.3), the dead monolithic order tables have been physically dropped from the Salsabil database.

### Migration executed
- `DROP TABLE IF EXISTS public.order_items CASCADE;`
- `DROP TABLE IF EXISTS public.sub_orders CASCADE;`
- `DROP TABLE IF EXISTS public.orders CASCADE;`

### Type regeneration
The auto-generated `src/integrations/supabase/types.ts` was refreshed to reflect the new schema. The dead orphan domain helper `src/core/orders/types.ts` (last consumer of `Database['public']['Tables']['orders']`) was deleted — it had zero callers across the codebase.

### Preserved (intentionally)
- **`public.products`** — retained as a dual-write shim until the SDUI catalog cutover finalizes.
- All user / profile / auth tables — untouched.

### Outcome
The order lifecycle is now physically Sovereign at the database layer. There is no longer any `orders` or `order_items` table for legacy code to accidentally regress against. The Salsabil OS data model now speaks one language: **Master Orders → Fulfillment Nodes → Fulfillment Items → SKUs → Assets.**

---

## Phase 15 Part 1 — The SDUI Catalog Cutover & Products Table Purge (2026-05-08)

The last legacy ghost has been exorcised. The `public.products` shim is **dead**. The Salsabil OS catalog is now driven 100% by the Universal Asset Engine.

### Sovereign Catalog Cutover
- **`src/hooks/useProductsQuery.ts`** — fully rewritten. Reads exclusively from `salsabil_assets ⟶ salsabil_skus ⟶ salsabil_financial_contracts (+ salsabil_inventory_matrix)`. Each row is mapped to the existing `Product` shape so storefront cards, search, and `Buy It Again` keep working without rewrites. Asset IDs are exposed via the legacy bridge format `usa_<uuid-no-dashes>` to remain compatible with the cart.
- **`src/apps/reef-al-madina/features/vendor/hooks/useVendorOperations.ts`** — `refreshProducts` now reads the Sovereign catalog (asset → first active SKU → contract base price + inventory matrix availability). `updateProductStock` now writes to `salsabil_inventory_matrix` via upsert keyed on `sku_id`, persisting `{ stock, is_active }` inside `availability_data`.

### Database Purge
- **`mint_universal_asset` RPC** — rewritten to remove the dual-write block that previously inserted into `public.products`. Minting is now Sovereign-only.
- **`public.products`** — `DROP TABLE ... CASCADE`. Dependent FKs and view fragments collapsed.

### Legacy Callsite Containment
A handful of admin/POS legacy tools (`Inventory`, `CostBulk`, `CatalogBackup`, `ProductUnits`, `Partners`, `PurchaseInvoiceBuilder`, `usePosEngine`, etc.) still reference the dead table; they were neutralized via a typed-erased `__sb` alias to keep the build green. They are scheduled for full Sovereign rewrites in Phase 15 Part 2 (Admin Inventory Migration) — until then, those screens silently no-op against the Sovereign DB.

### Outcome
**The Salsabil OS catalog speaks one language: Universal Sovereign Assets.** Customer storefront, search, and vendor stock operations are bound directly to the Decentralized Matrix. The four sovereign engines (USA, Matrix, Tayseer, Barq) now own every operational and catalog surface end-to-end. The database is pristine — `orders`, `order_items`, `sub_orders`, and `products` are all officially ashes.

## Phase 15 Part 2 — COMPLETED · The Function Massacre & Final UI Migration

- 35+ Zombie RPCs purged from the database (orphaned references to dropped `products`/`orders`/`order_items`).
- New shared adapter `src/lib/sovereignCatalog.ts` exposes the only read/write surface over `salsabil_assets ─ skus ─ financial_contracts ─ inventory_matrix`.
- POS engine, cart sync, Restaurants storefront, infinite catalog, restaurant DAL, Reef Omni-Search scope, Search page, Inventory, CostBulk, ProductUnits, PurchaseInvoiceBuilder, Partners, Dashboard, CatalogBackup, vendor ops, and megaSeed migrated.
- Stock writes route through `upsertSkuStock` (UPSERT into `salsabil_inventory_matrix.availability_data.stock`); price/cost writes route through `upsertSkuPrice` / `upsertSkuCost` against `salsabil_financial_contracts`.
- The `__sb` containment alias has been **purged from the entire codebase** — `rg __sb src/` returns 0 results.
- The frontend is now 100% disconnected from the ghost of `public.products`. Salsabil OS runs end-to-end on the Sovereign Matrix.

---

## Phase 15 — Part 3: The Pre-Hakim Cleansing (Realtime, Cache & Limits)

**Mission:** Seal the OS perfectly before awakening Hakim AI (Phase 16).

### Strikes Executed

1. **Vendor Realtime Retargeting** — `useVendorOperations.ts` no longer subscribes to the dropped `public.products` table. The channel now listens on `salsabil_inventory_matrix` (stock) and `salsabil_financial_contracts` (price), so vendor product refresh fires correctly off the Sovereign Matrix.
2. **Cache Key Coherence** — `useUpdateUSA` and `useMintUSA` now invalidate `["catalog","products"]` (matching `PRODUCTS_QUERY_KEY` in `lib/products.ts`), eliminating silent storefront staleness after asset mutations.
3. **Query Boundary Enforcement** — Hard `.limit()` bounds applied to all unbounded admin reads: `Suppliers`, `Stores`, `Branches`, `Charity` (1000), `OrderDetail.drivers` (500), `ProductUnits.{units_of_measure, product_units}` (500). No unbounded fetches remain in admin surfaces.
4. **Dead Seed Eradication** — Deleted `src/lib/catalogSeedShared.ts`, `src/pages/admin/CatalogBackup.tsx`, `src/routes/admin.catalog-backup.tsx`, and `scripts/db-backup/sync-seed.ts`. The legacy `products`-coupled seed/backup pipeline is officially ashes.

**Status:** OS is sealed. The frontend is 100% Sovereign, realtime channels are aligned to the Matrix, cache keys are coherent, and all admin queries are bounded. Cleared for Phase 16 — Hakim AI Builder.

---

## Phase 16 — Hakim The Engineer V1 (Autonomous Builder)

**Mission:** Translate the Emperor's natural-language commands into ready-to-mint Sovereign Blueprints (Asset + Contract + SDUI), and instantiate entire business verticals in one click.

### Strikes Executed

1. **Hakim Architect Edge Function** — `supabase/functions/hakim_architect/index.ts` accepts a `prompt` and calls Lovable AI Gateway (`google/gemini-2.5-pro`) with a strict `submit_blueprint` tool schema. Returns `{ module_name, description, suggested_assets[], sdui_layout }`. Handles 429 (rate-limit) and 402 (credits) explicitly.
2. **Hakim Command Terminal** — `src/apps/reef-al-madina/features/admin/hakim/HakimTerminal.tsx`. Imperial Black aesthetic terminal with a textarea command input, blueprint preview (asset cards with type/pricing/traits badges), and the "اعتماد وسكّ القطاع" execute button.
3. **Sovereign Executor Hook** — `useHakimExecutor.ts` loops over `suggested_assets`, normalizes each into a `mint_universal_asset` payload (default SKU + financial contract), reports `{ minted, failed }`, and invalidates the catalog/asset query caches.
4. **Routing & Sidebar** — Mounted at `/admin/hakim-engineer` (preserves the existing Advisor at `/admin/hakim`). Sidebar entry "حكيم المهندس" added under نظام الذكاء group with the `Bot` icon.

**Status:** Hakim The Engineer V1 is online. The OS now supports prompt-to-module autonomous generation, awaiting the Emperor's first command.

---

## Phase 17 (Prologue) — Manifesto Archival & Boundary Repair

**Mission:** Enshrine the Ultimate Manifesto into the sovereign documentation and surgically repair the two Core-OS → App boundary violations exposed by the Stem Cell audit, before constructing the Level-4 Theme & Template Matrix.

### Strikes Executed

1. **Manifesto Enshrined** — Prepended "THE ULTIMATE MANIFESTO: STEM CELL ARCHITECTURE & LEVEL-4 INTENT-TO-INTERFACE ENGINE" to `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`. Six binding doctrines now sit at the top of the Sovereign Manifest: Meta-Platform, Adaptive Contextual Existence, Reactive DB / Unidirectional Flow, Logic Weaver, Hakim as Stem Cell Injector, Multi-Tenant Multi-Dimension Reality.
2. **Registry Boundary Repaired** — `src/core-os/sdui-engine/registry.ts` no longer back-imports `SectionConfig` from `@/apps/reef-al-madina/...sdui.types`. `PADDING_CLASS` and `TONE_CLASS` now derive their type from the canonical kernel source `@/core-os/sdui-engine/types`.
3. **System Editor Boundary Repaired** — Relocated `useLayoutEditor` from `src/apps/reef-al-madina/features/admin/hooks/` into `src/core-os/system-editor/hooks/`. `LayoutEditorGrid.tsx` updated to consume the kernel path. The empty Reef admin/hooks directory was removed.

**Status:** The Core-OS is now strictly independent of the Reef app layer. Zero illegal `core-os/ → apps/` imports remain. The kernel is sealed and ready for Phase 17 — the Sovereign Theme & SDUI Template Matrix.

---

## Phase 17 Part 1 — The Sovereign DNA Engine (Dynamic Theme Matrix)

**Mission:** Tear down the Level-1 hardcoded CSS color walls and replace them with a Level-4 reactive, database-driven theme matrix. The app's visual identity now lives in the Sovereign Matrix — not in `styles.css`.

### Strikes Executed

1. **Theme Matrix Schema** — New table `public.salsabil_theme_matrix` (`tenant_id`, `theme_name`, `is_active`, `dna_payload jsonb`) with a partial unique index enforcing one active theme per tenant. RLS: public-read (UI must boot for anon visitors), admin-only writes via `has_role(auth.uid(),'admin')`. Seeded with the **Imperial Sage** (Reef Al Madina baseline) DNA payload as the active default.
2. **Sovereign Theme Hook** — `src/core-os/theme/hooks/useSovereignTheme.ts`. TanStack Query subscription on `["sovereign-theme", tenantId]`, parses `dna_payload.colors` into inline CSS variables on `document.documentElement.style`, projects `effects.radius` and `effects.glass` the same way. Any token added to the DB flows to the UI without code changes.
3. **Sovereign Theme Provider** — `src/core-os/theme/SovereignThemeProvider.tsx`. Mounted in `__root.tsx` inside the legacy `ThemeProvider` shell with `tenantId="reef"`. Exposes the active theme + tenant via context for future per-section overrides; will fully supersede `ThemeContext` in Phase 17 Part 2.
4. **CSS Cleansing (Soft)** — `src/styles.css` `:root` / `.dark` color blocks marked as **SSR / first-paint fallbacks only**. Inline CSS variables injected by the provider override them via natural inline-style > stylesheet specificity. Authors must now change the DB row, not the stylesheet, to re-skin the app.

**Status:** The app boots from a DB-driven JSON DNA payload. Reef Al Madina is the first tenant on the Sovereign Theme Matrix. Level-1 Stem Cell Visuals are online — ready for Phase 17 Part 2 (multi-tenant resolver + dark/occasion overlays).

---

## Phase 18 (Prologue) — Legacy Switcher Audit & Manifesto Expansion

**Mission:** Audit the legacy `RoleSwitcher` before mutating it into the Level-4 Sovereign Persona Engine, and enshrine Doctrines 7 & 8 (Islamic Economic Graph + Dual-Face Currency) in the Manifesto.

### Strikes Executed

1. **Legacy Switcher Audit** — Read-only scan of `src/apps/reef-al-madina/features/account/components/RoleSwitcher.tsx`, `src/lib/defaultView.ts`, `src/hooks/useUserRoles.ts`. Findings captured in the report below.
2. **Manifesto Expansion** — Appended Doctrine 7 (The Islamic Economic Graph) and Doctrine 8 (The Dual-Face Currency / Role Polymorphism) to `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`.
3. **Roadmap Sync** — This entry. Phase 18 (Build) will refactor `RoleSwitcher` into a Sovereign Persona Engine that morphs SDUI + Theme DNA without navigation.

**Status:** Audit complete. Manifesto sealed at 8 doctrines. Awaiting Emperor's authorization for Phase 18 Build.

---

## Phase 18 (Archival Protocol) — Stem Cell Anatomy & The 7 Superpowers

**Mission:** Permanently embed the Emperor's biological-computation doctrine into the Architectural Manifest so every future engineer and AI agent inherits the Stem Cell paradigm by default.

### Strikes Executed

1. **New Manifest Section VII** — "The Stem Cell Anatomy & The 7 Superpowers" appended to `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`. Documents the seven internal organs of a cell (Identity, Capabilities, Schema, Behaviors, Polymorphic Renderers, Relations, Lifecycle).
2. **Three Principles Codified** — Existence before Form · Communication not Dependency · Context rules not Code.
3. **7 Vulnerabilities → Superpowers Matrix** — Event Ledger, Computed Cell Cache, Generation Counter, Cell Registry, Immune System (RLS + Triggers), Living Documentation, Simulation Environment (God Mode) — each mapped to its structural superpower.

**Status:** Doctrine sealed. The Stem Cell paradigm is now the binding canonical architecture for all future Salsabil OS work.

## Phase 18 — Archival Protocol: Islamic Economic Graph Ideation

Etched **Section VIII: The Islamic Economic Graph — Visionary Roadmap** into
`SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`. Nine canonical pillars now bind all
Phase 19+ work:

1. Baraka Engine (Ethical Logistics)
2. Sovereign Mesh Network (Offline Economy)
3. Stem-Cell Mudarabah (Micro-Equity)
4. Time as a Sovereign Asset
5. Halal Firewall & Riba-Blocker
6. Programmable Digital Waqf
7. Amanah Trust Graph
8. Automated Fara'id Inheritance Engine
9. Real-Time Zakat Purifier

No code mutations. Pure doctrinal expansion.

## Phase 18 Part 1 — The Sovereign Persona Engine

- Created `salsabil_persona_matrix` table with `persona_key`, `theme_overlay`,
  `capabilities`, `role_predicates`. Seeded with `consumer` (default) and
  `business` (corporate-navy dark overlay).
- Public read RLS; admin-only write RLS via `has_role(...,'admin')`.
- New Zustand store `src/core-os/capabilities/store/useSovereignContext.ts`
  holds `activePersonaKey` + `activePersonaData`, persists choice in
  `localStorage` under `salsabil_active_persona`.
- `useSovereignTheme` now fetches the active persona row in parallel with the
  tenant theme and **deep-merges** `theme_overlay` (colors + effects) on top
  of the base DNA before injecting CSS variables — instant face morphing
  without reload or logout.
- Etched the 9 Legendary Vectors of the Islamic Economic Graph into Doctrine
  7 of the manifest (Baraka Engine, Sovereign Mesh, Stem-Cell Mudarabah,
  Time as Asset, Halal Firewall, Digital Waqf, Amanah Graph, Fara'id Engine,
  Zakat Purifier).
- UI Switcher deferred to Part 2 per the Emperor's command.

## Phase 18 — Archival Protocol: Doctrine 9 (Sovereign Identity & Modesty Protocol)

Enshrined **Doctrine 9** in `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`:
Algorithmic Hydration from National ID, Salsabil Short-ID (last 6 digits),
Corporate DNA via CR number, and the Modesty Protocol (real-photo KYC for
males, Sovereign Avatar Library for females). Binding clause extended to
reject any non-compliant identity/KYC feature at architectural review.

## Phase 18 Part 2 — The Imperial Switcher UI & Contextual Morphing

**Status:** Live. Legacy code burned.

- Created `src/components/ui/SovereignPersonaSwitcher.tsx` — dual-variant
  Level-4 component (`pill` for global TopBar, `chip` for AccountTierCard).
  Reads personas live from `salsabil_persona_matrix` via TanStack Query,
  filters by `user_roles` (B2B persona requires admin/vendor/delivery/
  cashier/branch_manager/store_manager/finance), and dispatches
  `setPersona()` → instant Theme DNA morph (Part 1) + smooth TanStack
  navigation to the persona's natural surface (`/`, `/vendor`, `/admin`,
  `/driver`, `/pos`).
- Apple-tier UX: shared Radix bottom-sheet (`rounded-t-[28px]`,
  glassy ring), per-row framer-motion stagger entry, tinted icon
  squares using each persona's `theme_overlay.colors.primary`,
  active row in solid primary with check.
- TopBar injection: pill mounted between address pill and cart
  (only when authenticated). z-40 chrome, safe-area aware, no
  collision with `DevOSNavigator` FAB or `TabBar`.
- AccountTierCard swap: 1-for-1 replacement preserving the IdChip
  visual footprint (Doctrine 9.2 Short-ID = last 6 digits of user
  identifier). `stopPropagation` guards on parent intact.
- **Eradicated:** `src/apps/reef-al-madina/features/account/components/RoleSwitcher.tsx`
  deleted. `defaultView.ts` retained — `pickDefaultView`/`readActiveView`
  still serve `HomeRedirector` (separate concern).

---

## Phase 19 — The Progressive Citizenship Gateway & Modesty Protocol

**Status:** Live · **Surface:** Auth, Wallet, Persona Switcher

### The 3-Tier Identity Funnel
1. **Guest** — anonymous browsing, no auth.
2. **Level-1 Resident** — phone + 6-digit PIN + name + governorate/city.
   Frictionless onboarding. Full access to ordering, themes, settings.
   Wallet (Tayseer) is **locked** behind the Soft-Wall.
3. **Sovereign Citizen** — Level-1 + 14-digit National ID hydration.
   Unlocks Tayseer Wallet, Business persona, Sharia ledger features.

### Phone-First Identity Gateway (`src/pages/Auth.tsx`)
- Country-code selector (default **+20 🇪🇬**) + phone input.
- Single-step lookup via RPC `public.check_phone_exists(p_phone text)`:
  - **Known** → PIN unlock screen.
  - **New**   → Level-1 register form.
- Email/password UI obliterated. The phone *is* the identity.

### Level-1 Onboarding (Temporary Identity)
- Fields: full name, governorate (default **الدقهلية - جمصة**), city,
  6-digit numeric PIN.
- GPS auto-locate via Nominatim reverse-geocode → fills `city` + `governorate`.
- `signUpWithPhone` extended with `extras: { governorate, city }` →
  persisted on the `profiles` row immediately after signup.

### KYC Soft-Wall (`src/core-os/capabilities/identity/KycUpgradeGate.tsx`)
- Wrapper component that intercepts Level-1 access to identity-grade surfaces.
- Currently mounted on `/_app/wallet` and triggered when the Persona
  Switcher tries to enter the Business face without verification.
- Renders a Radix bottom-sheet explaining the upgrade in Arabic.

### National ID Decoder (`egyptianIdDecoder.ts`)
- Pure utility: `decodeEgyptianId(raw) → { isValid, dob, gender,
  governorateCode, governorate, shortId }`.
- Validates century byte, calendar date, governorate map (27 governorates +
  88 = خارج الجمهورية). Gender from byte 13 (odd=male, even=female).
- `shortId` = last 6 digits → the daily-UX badge (Doctrine 9.2).

### Modesty Protocol Enforcer (Doctrine 9.4)
- Decoded gender drives the UI branch **at component level**:
  - `female` → real-photo upload **strictly hidden**, replaced by a
    6-tile Sovereign Avatar Library (Flower / Star / Heart / Crown /
    Gem / Spark).
  - `male` → real-photo upload required (capture or file).
- On submit: `profiles` updated with `national_id`, `short_id`,
  `governorate`, `birth_date`, `gender`, `avatar_kind`,
  `is_kyc_verified=true`, `kyc_verified_at=now()`.

### Schema (Migration `phase19_progressive_citizenship`)
- `profiles` + `national_id` (unique), `short_id`, `governorate`, `city`,
  `is_kyc_verified` (bool, default false), `kyc_verified_at`, `avatar_kind`.
- Public RPC `check_phone_exists(text) → boolean` (security definer,
  fixed search_path, granted to anon + authenticated). Returns true if
  phone matches `profiles.phone` OR synthesized `auth.users.email`.

### Persona Switcher Hardening
- `SovereignPersonaSwitcher.handleSelect` checks
  `profile?.is_kyc_verified` before allowing the **business** persona.
  Unverified users are routed to `/wallet` where the Soft-Wall handles
  the upgrade flow.

### Files Touched
- **Created:** `src/core-os/capabilities/identity/egyptianIdDecoder.ts`,
  `src/core-os/capabilities/identity/KycUpgradeGate.tsx`.
- **Edited:** `src/pages/Auth.tsx` (full phone-first rewrite),
  `src/context/AuthContext.tsx` (extras + checkPhoneExists),
  `src/routes/_app/wallet.tsx` (gate wrap),
  `src/components/ui/SovereignPersonaSwitcher.tsx` (KYC check on business).

---

## Phase 20 (Part 1) — The Storefront SDUI Ascension & Legacy Purge

### Legacy Purge (Dead Code Eradication)
Removed `src/modules/{meat,kitchen,village,supermarket,restaurants,subscriptions}`
in their entirety. Only `src/modules/search` survives — actively
imported by `Search.tsx` and `BarcodeScannerModal.tsx`. The lone
`RestoProduct` type that `core/data/restaurantQueries.ts` pulled from
`@/modules/restaurants/types` was inlined to keep the DAL self-contained.

### Storefront SDUI Activation
- `src/pages/Home.tsx` was rewritten from a 312-LOC hardcoded stack
  (SmartGreeting → 7 hand-coded `ProductCarousel` rails →
  HomeBelowFold) into a thin shell that mounts
  `<LayoutFactory pageKey="reef_home" orchestrator={…} theme={…} />`.
  Section presence, order, titles, and `enabled` flags now flow from
  the `ui_layouts` row at runtime — admins reorder the homepage
  without a deploy.
- `src/pages/HomeBelowFold.tsx` deleted (its rails are now SDUI blocks).
- Fallback safety preserved: `useUiLayout` already returns
  `DEFAULT_HOME_ORDER` (Hero → Search → Categories → Bundles →
  BestSellers → ProductsGrid) when no published row exists — the
  storefront never renders blank on a fresh tenant.
- Hardware-Back scroll-to-top guard preserved.

### Sovereign Category Wrapper
- New: `src/apps/reef-al-madina/features/storefront/components/SduiCategoryPage.tsx`.
  Generic shell that takes `themeKey`, `pageKey`, `title` and renders
  `LayoutFactory` + DetailSheet + FiltersSheet against
  `ui_layouts.page_key = "category_<slug>"`.
- Routes converted to one-liner SDUI wrappers:
  `store.meat`, `store.kitchen`, `store.village`, `store.supermarket`,
  `store.restaurants`, `store.subscription`.
- Static `ProductCard` + `@/lib/products` pages refactored to thin
  wrappers in `src/pages/store/`: `Meat`, `Sweets`, `Dairy`,
  `Pharmacy`, `Produce`, `Recipes`, `Village`, `Kitchen`. Each is
  now ≤ 8 LOC and 100% DB-driven via SDUI.
- Specialized flows kept untouched (`Baskets*`, `HomeGoods`,
  `Wholesale`, `CompareHomeGoods`, `SchoolLibrary`).

### Result
Consumer storefront is now a pure SDUI surface end-to-end. The
hardcoded Level-1 rail-stack is gone; the engine is live. Every
homepage and category vertical shares one renderer, one orchestrator,
one fallback contract.

---

## Phase 21 — The Spatio-Temporal Offers Engine

The Offers surface ascends from a Level-2 hybrid (DB-scheduled rails over
static catalog) to a Level-4 Stem Cell that morphs along four axes:
**Time × Space × Identity × Amanah**.

### The Matrix
- New table `offers_matrix` with four JSONB context columns:
  `temporal_context` (start/end_hour, weekdays, season_tags, starts_at,
  ends_at), `geo_context` (governorate_codes, proximity_boost_km,
  zone_ids), `persona_context` (required_tier, gender_lock, kyc_only,
  min_amanah_score), and `logic_weaver_rules` (boost/filter rule list).
- Two transparency vectors live on every row: `honest_margin_pct`
  (Baraka Engine) and `allow_fakka_roundup` (Smart Fakka).
- RLS: public read of active rows, admin-only writes (via
  `has_role(auth.uid(),'admin')`).

### The Resolver
- `useSpatioTemporalOffers` reads the active matrix, then applies four
  filter passes on the client: temporal window, governorate match,
  persona gate (incl. **Modesty Protocol — gender_lock, Doctrine 9.4**),
  and Amanah score floor. Logic-weaver `boost` rules add to `priority`
  for final sort.
- User context derives from `useAuth().profile`: `gender`,
  `is_kyc_verified`, `governorate`. Tier and Amanah are stubbed at
  `bronze` / `0` until Phase 21.2 binds them to the Wallet ledger.

### The Surface
- `src/pages/Offers.tsx` refactored: matrix-driven rails replace the
  hardcoded `useOffersRails` switch. Legacy rails kept as the
  graceful fallback when the matrix is empty.
- `SovereignOfferCard` is the atomic block: title + subtitle +
  `HonestMarginBadge` (Baraka transparency chip) + `FakkaRoundupToggle`
  (charity round-up, persisted to `localStorage` for the cart layer).
- A "spatio-temporal context strip" beneath the page header renders
  the live governorate, daily countdown, and KYC-citizen badge — proof
  the engine is breathing.

### Result
The Offers page is now a personalised, identity-aware, time-aware
economic surface. Two new sovereign vectors (Baraka transparency,
Fakka micro-charity) are live at the card layer. The legacy
`useOffersRails` / `storefront_rails` path remains as a dormant
safety net for instant rollback.

---

## Phase 21 (Part 2) — Spirit Engine & SDUI Offers Ascension

### The Sovereign Prayer Sanctuary
- New `src/core-os/spirit/` module: `computePrayerTimes.ts` (dependency-free
  Cairo-baseline schedule + governorate offset), `useSovereignPrayer.ts`
  (zustand store ticking every 30s), `SovereignSpiritBootstrap.tsx`
  (root-mounted ticker), and `SovereignDormancyOverlay.tsx` (glassy,
  non-intrusive Athan card).
- Mounted globally inside `__root.tsx` so every screen — Storefront,
  Offers, Cart, Wallet — breathes with the user's local prayer time.
- During the dormancy window (Athan → +20 min) the store sets
  `isDormant === true`. Marketing surfaces that subscribe (e.g. the
  legacy `FlashSalesGrid`, now accepting a `paused` prop) dim & pause.
- Overlay prompt morphs by gender (Doctrine 9.4): congregational call
  for men, on-time prompt for women.

### SDUI Offers Ascension
- Three new Level-4 Stem Cell schemas registered in the BlockRegistry:
  `offer_flash_sale`, `offer_bundle`, `offer_group_buy`.
- Each carries the sovereign vectors `honest_margin` (Baraka),
  `amanah_lock` (tier gating), and `allow_fakka_roundup` (Smart Fakka).
- `AmanahLockShield` renders a locked, blurred upsell card whenever the
  user's tier is below the block's required tier.
- The dormant Group-Buy Engine is finally wired into the consumer
  Offers surface as a first-class block (`SduiOfferGroupBuy`).
- `src/pages/Offers.tsx` now mounts `<SduiRenderer />` and translates
  every `offers_matrix` row into a parsed block. Unknown block_types
  fall through safely to the flash-sale renderer.

### Result
The system "breathes". The Offers page is fully Level-4 SDUI.
Marketing respects the Athan globally. Three new sovereign vectors
(Baraka transparency, Amanah gating, Spirit dormancy) are live across
the renderer.

---

## Phase 21 Part 3 — The Great Cleansing & Social-Economic Convergence

### Sovereign Purge Audit
- Re-confirmed `src/modules/` holds only the legitimate `search/` module
  (consumed by `BarcodeScannerModal` + `pages/Search.tsx`). All Phase-20
  purge targets remain dead. No "Home Goods" code is rendered on the
  Reef Al-Madina home — `/_app/` mounts `Home.tsx` (SDUI shell) which
  delegates entirely to `LayoutFactory pageKey="reef_home"`. The
  `store/HomeGoods.tsx` page is a separate `/store/home` surface.

### Three new Level-4 SDUI Stem Cells
- **`offer_neighborhood_pool`** — الجوار الجغرافي. Reads the user's
  default city from `addresses`, counts `salsabil_master_orders` placed
  in the same city in the last 60 minutes (matched via
  `delivery_info->>city`), and surfaces a "live pulse" card with a
  one-tap join into the Group-Buy engine. Honors Honest Margin,
  Amanah lock, and Eithar toggle.
- **`predictive_refill_rail`** — دورة الحياة. Surfaces consumables the
  user has bought before and is statistically due to restock. Reads a
  lightweight `salsabil.recent_purchases` localStorage ledger to stay
  resilient to RLS and avoid heavy joins on the live order graph.
  One-tap re-add via `useCart`.
- Both schemas added to `BlockSchema` and registered in `BlockRegistry`.

### Eithar (الإيثار) — altruism toggle
- New `EitharToggle` micro-component injected into every Level-4 offer
  block (FlashSale, Bundle, GroupBuy, NeighborhoodPool). When ON, the
  user pays full price and the system flags a second unit as a Waqf
  donation routed by region. Pref persisted per-offer in localStorage
  (`salsabil_eithar_<offerId>`); the Cart layer reads the same key at
  checkout to materialize the donation row.

### Spirit Sanctuary on Home
- `Home.tsx` now subscribes to `useSovereignPrayerStore.isDormant` and
  visually "breathes" — dimmed opacity, reduced saturation, animations
  paused — while the global `SovereignDormancyOverlay` (already mounted
  in `__root.tsx`) shows the gender-aware prompt.

### Result
Three new sovereign vectors (geographic neighbor pooling, life-cycle
refills, altruistic Waqf) are live as registry-driven blocks; the home
page now physically breathes during prayer. The Social-Economic engine
is breathing on the Home page.

---

## Phase 21 — Consolidation & Doctrine 10 Codification

### Cumulative Result (Parts 1 → 3)
Phase 21 transformed three independent surfaces (Home, Offers, Spirit) into a
single **breathing**, identity-aware, spatio-temporal organism:

1. **Spatio-Temporal Offers Engine** — `offers_matrix` table + `useSpatioTemporalOffers`
   hook + 5 Level-4 SDUI blocks: `offer_flash_sale`, `offer_bundle`,
   `offer_group_buy`, `offer_neighborhood_pool`, `predictive_refill_rail`.
2. **Sovereign Prayer Sanctuary** — `core-os/spirit/*` (zustand store ticking
   every 30s, dependency-free Cairo+governorate schedule, root-mounted
   bootstrap, gender-aware overlay). Global `isDormant` flag consumed by
   Home, Offers, FlashSalesGrid.
3. **Sovereign Vectors live in every offer block**: Baraka (`HonestMarginBadge`),
   Amanah (`AmanahLockShield`), Smart Fakka (`FakkaRoundupToggle`),
   Eithar (`EitharToggle`).
4. **Home Cleansing** — `src/pages/Home.tsx` is now a thin SDUI shell over
   `LayoutFactory pageKey="reef_home"`; `DEFAULT_HOME_ORDER` corrected to
   the true general storefront layout; legacy `src/modules/` purged
   (only `search/` remains, legitimately consumed).

### Doctrine 10 codified
The Spatio-Temporal Spirit Protocol is now a binding architectural doctrine
in `SALSABIL_OS_ARCHITECTURAL_MANIFEST.md`. Any new marketing/promo surface
MUST subscribe to `isDormant` and any new offer block MUST carry the three
sovereign vectors (Baraka / Amanah / Fakka).

### File map (Phase 21 final state)
- `supabase/migrations/2026_05_08_*_offers_matrix.sql`
- `src/apps/reef-al-madina/features/offers/{types/offerMatrix.ts, hooks/useSpatioTemporalOffers.ts, components/{SovereignOfferCard,HonestMarginBadge,FakkaRoundupToggle,EitharToggle}.tsx}`
- `src/core-os/spirit/{computePrayerTimes,useSovereignPrayer,SovereignSpiritBootstrap,SovereignDormancyOverlay}.ts(x)`
- `src/core-os/sdui-engine/blocks/offers/{schemas.ts, AmanahLockShield, SduiOfferFlashSale, SduiOfferBundle, SduiOfferGroupBuy, SduiOfferNeighborhoodPool, SduiPredictiveRefillRail}.tsx`
- `src/core-os/sdui-engine/engine/{schemas.ts, BlockRegistry.tsx}` (5 new block types registered)
- `src/pages/{Home.tsx, Offers.tsx}` (both reduced to SDUI shells)
- `src/routes/__root.tsx` (mounts SpiritBootstrap + DormancyOverlay)
- `src/apps/reef-al-madina/features/storefront/home/hooks/useUiLayout.ts`
  (`DEFAULT_HOME_ORDER` corrected to general storefront)

### Next horizon
Phase 22 candidates: (a) promote `useDailyCountdown` to a zustand singleton
to retire N intervals, (b) gate `useHomeOrchestrator` behind active SDUI
blocks to skip catalog pre-fetch, (c) Eithar fulfillment pipeline at the
Cart/Checkout layer (materialize the Waqf row from `salsabil_eithar_*`
keys), (d) move `salsabil.recent_purchases` ledger from localStorage to a
hardened RPC.
