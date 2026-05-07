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
