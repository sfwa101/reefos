# 🏛️ ARCHITECTURAL ROADMAP — The Strategic Archive
### Reef Almadina Super-App · Sovereign Scaling Manifesto

> **Status:** Permanent architectural record. Not a backlog — a constitution for deferred high-level optimizations.
> **Audience:** Future engineers (human + AI) inheriting the platform post Phase L.
> **Last updated:** Phase L complete (Settlement Engine + Real-Time Triggers live).

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
