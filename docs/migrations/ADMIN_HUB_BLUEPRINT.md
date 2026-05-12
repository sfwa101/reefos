# Admin Hub Blueprint — Replacing "الأصول" with "المحركات"

> Read-only reconnaissance for the Admin mobile bottom-nav refactor.
> No source files were modified during this audit.

---

## 1. Reconnaissance Summary

### 1.1 Mobile Bottom Navigation

- **Component:** `src/components/admin/BottomTabBar.tsx`
- **Mounting site:** `src/components/admin/AdminShell.tsx` (renders `<BottomTabBar />` on mobile breakpoints)
- **Data source (single source of truth):** `src/components/admin/nav/workspaceNav.ts`
  - Function `buildBottomTabsForKind(kind)` returns the **top 5** unique items from `buildNavForKind(kind)` per active `WorkspaceKind` (`reef`, `tayseer`, `noor_eldin`, `family`, `global`).
- **Tab to replace:** Line 48 of `workspaceNav.ts`
  ```ts
  { to: "/admin/assets", icon: Layers, label: "الأصول" },
  ```
  This entry sits inside the `REEF` group and consequently bubbles into the bottom-nav for `reef` + `global` workspaces.

### 1.2 Admin Routing

- **Route shell:** `src/routes/admin.tsx` → wraps `<AdminShell />` inside `<RoleGuard>`.
- **Routing convention:** TanStack Router file-based, flat dot-separated (e.g. `src/routes/admin.assets.tsx`, `src/routes/admin.dashboard.tsx`). The router tree is auto-generated.
- **All 70+ admin pages** already exist as discrete route files and as components in `src/pages/admin/*.tsx`.

### 1.3 Constitutional Posture

Per Wave R-1 (Batches 1–7), every admin page now consumes server functions only. The new Hub is a **pure presentation page** (links + icons) — it makes ZERO database/RPC calls and therefore introduces no Article 3a / 5 risk.

---

## 2. Target File Plan

| Purpose | Path | State |
|---|---|---|
| New Hub page component | `src/pages/admin/AdminHub.tsx` | **CREATE** |
| New Hub route | `src/routes/admin.hub.tsx` | **CREATE** |
| Bottom-nav registry | `src/components/admin/nav/workspaceNav.ts` | **EDIT** (swap one line) |
| Optional: route alias for `/admin/engines` | not needed — `/admin/hub` is sufficient | — |

---

## 3. Hub Information Architecture

The Hub groups all ~70 admin destinations into 7 clusters. Each cluster is rendered as an Apple-style **grouped card** (rounded `rounded-3xl`, `glass`/`bg-surface` background, `shadow-elegant`, `divide-y divide-border/40`). Each row uses a 28×28 tinted icon bubble + Arabic label + `ChevronLeft` (RTL) affordance.

### Cluster 1 — العمليات (Operations)
`ShoppingBag` Orders → `/admin/orders/` ·
`Package` Products → `/admin/product-units` ·
`Layers` Assets → `/admin/assets` ·
`Sparkles` New Product (Hakim) → `/admin/products/new` ·
`Boxes` Inventory → `/admin/inventory` ·
`MapPin` Inventory Locations → `/admin/inventory-locations` ·
`AlertTriangle` Low Stock → `/admin/low-stock` ·
`Repeat` Cross-Branch Transfers → `/admin/cross-branch-transfers` ·
`ClipboardList` Allocation Monitor → `/admin/allocation` ·
`Tags` Categories → `/admin/categories` ·
`Truck` Delivery → `/admin/delivery` ·
`Settings2` Delivery Settings → `/admin/delivery-settings` ·
`Printer` Print Jobs → `/admin/print-jobs`

### Cluster 2 — التجارة والجمهور (Commerce & Audience)
`Store` Stores → `/admin/stores` ·
`Building2` Branches → `/admin/branches` ·
`Users` Customers → `/admin/customers` ·
`UserCog` Human Directory → `/admin/humans` ·
`Star` Reviews → `/admin/reviews` ·
`MessageSquare` Support → `/admin/support` ·
`Compass` Personalized Picks → `/admin/personalized-picks`

### Cluster 3 — التسويق (Marketing)
`Megaphone` Marketing Hub → `/admin/marketing` ·
`Image` Banners → `/admin/marketing/banners` ·
`Sparkles` Promos → `/admin/marketing/promos` ·
`Bell` Notifications → `/admin/marketing/notifications` ·
`Share2` Referrals → `/admin/marketing/referrals` ·
`Gift` Offers → `/admin/offers` ·
`HeartHandshake` Affiliate Settings → `/admin/affiliate-settings`

### Cluster 4 — المالية (Finance)
`Wallet` Wallets → `/admin/wallets` ·
`Banknote` Payouts → `/admin/payouts` ·
`Receipt` Expenses → `/admin/expenses` ·
`BarChart3` Finance Reports → `/admin/finance` ·
`BookOpen` Finance Ledger → `/admin/finance/ledger` ·
`Coins` CFO View → `/admin/cfo` ·
`LineChart` Executive Dashboard → `/admin/executive` ·
`PiggyBank` Savings → `/admin/savings` ·
`CalendarClock` Payments Schedule → `/admin/payments-schedule` ·
`FileText` Purchase Invoices → `/admin/purchases` ·
`Tag` Cost Bulk → `/admin/cost-bulk` ·
`Percent` Discount Overrides → `/admin/discount-overrides` ·
`HandCoins` Commission Ledger → `/admin/commission-ledger` ·
`Handshake` Partner Ledgers → `/admin/partner-ledgers` ·
`Users2` Partners → `/admin/partners` ·
`Building` Suppliers → `/admin/suppliers` ·
`Car` Driver Settlements → `/admin/driver-settlements` ·
`Coins` Driver Cash → `/admin/driver-cash-settlements` ·
`Store` Store Settlements → `/admin/store-settlements` ·
`ScrollText` USA Ledger → `/admin/$entity` (entity browser) ·
`Inbox` Top-up Approvals → `/admin/topup-approvals`

### Cluster 5 — الموارد البشرية (HR)
`UserCheck` Staff → `/admin/staff` ·
`Clock` Attendance → `/admin/staff-attendance` ·
`Wallet` Staff Advances → `/admin/staff-advances` ·
`CheckSquare` Advance Approvals → `/admin/advance-approvals` ·
`ShoppingCart` Cashier Sessions → `/admin/cashier-sessions` ·
`ShieldCheck` KYC → `/admin/kyc`

### Cluster 6 — الامتثال والسيادة (Compliance & Sovereign)
`Scale` Zakat → `/admin/zakat` ·
`HeartHandshake` Charity → `/admin/charity` ·
`ShieldCheck` Riba Audit → `/admin/riba-audit` ·
`Vault` Sovereign Treasury → `/admin/sovereign-treasury` ·
`Activity` Control Plane → `/admin/control-plane` ·
`FileClock` Tracing → `/admin/tracing` ·
`Eye` Profit Observation → `/admin/profit-observation` ·
`FileClock` Audit Log → `/admin/audit-log` ·
`KeyRound` Role Permissions → `/admin/role-permissions`

### Cluster 7 — حكيم والذكاء (Hakim & Intelligence)
`Brain` Hakim → `/admin/hakim` ·
`MessageCircle` Hakim Chat → `/admin/hakim-chat` ·
`Sparkles` Hakim Insights → `/admin/hakim-insights` ·
`Lightbulb` Hakim Advisor (via insights page) ·
`AlertOctagon` Hakim Anomalies → `/admin/hakim-anomalies` ·
`Wrench` Hakim Engineer → `/admin/hakim-engineer` ·
`TrendingUp` Category Affinity → `/admin/category-affinity` ·
`BarChart3` Analytics → `/admin/analytics` ·
`Gauge` Business Ops Dashboard → `/admin/dashboard` ·
`SlidersHorizontal` Business Rules → `/admin/business-rules`

### Cluster 8 — النظام (System) — collapsed footer
`Settings` Settings → `/admin/settings` ·
`Sliders` System Settings → `/admin/system-settings` ·
`Palette` Design Editor → `/admin/design`

---

## 4. UI Architecture (Apple-Style Premium)

### 4.1 Page Skeleton (`AdminHub.tsx`)
```
<main dir="rtl" className="min-h-dvh bg-background pb-32">
  <header className="sticky top-0 z-20 glass-strong border-b border-border/40">
    <div className="px-4 h-14 flex items-center justify-between">
      <h1 className="font-display text-[20px]">المحركات</h1>
      <SearchInput placeholder="ابحث في المحركات…" />  // pure client filter
    </div>
  </header>

  <div className="px-4 pt-4 space-y-6 max-w-2xl mx-auto">
    {clusters.map(cluster => <HubGroup {...cluster} />)}
  </div>
</main>
```

### 4.2 `HubGroup` (one cluster card)
- Container: `rounded-3xl bg-surface/80 backdrop-blur border border-border/40 shadow-elegant overflow-hidden`
- Header: `px-4 py-3 text-[13px] text-foreground-tertiary font-semibold uppercase tracking-wide`
- Body: `divide-y divide-border/30`

### 4.3 `HubRow`
```
<Link to={item.to} className="flex items-center gap-3 px-4 py-3 press transition-base active:bg-surface-muted">
  <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
    <item.icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
  </div>
  <span className="flex-1 text-[15px] font-medium">{item.label}</span>
  <ChevronLeft className="h-4 w-4 text-foreground-tertiary" />
</Link>
```

### 4.4 Motion (optional, allowed)
- Stagger fade-in on cluster cards (`framer-motion` `initial/animate` y:8→0, 60 ms stagger).
- No heavy hero animation — Apple discipline favors restraint.

### 4.5 Accessibility
- Full RTL.
- Each row is a real `<a>` (TanStack `Link`) → cmd+click, preload, screen-reader friendly.
- 44 px min touch target.

---

## 5. Bottom-Nav Surgical Edit

In `src/components/admin/nav/workspaceNav.ts`, replace **only** the assets row inside `REEF[0].items`:

```diff
- { to: "/admin/assets", icon: Layers, label: "الأصول" },
+ { to: "/admin/hub",    icon: LayoutGrid, label: "المحركات" },
```

(Add `LayoutGrid` to the `lucide-react` import line. The asset destination remains reachable from the Hub — Cluster 1.)

`buildBottomTabsForKind` will continue to slice the first 5 items, so "المحركات" naturally surfaces as the 3rd tab on `reef` + `global` workspaces. No further nav code changes required.

---

## 6. Execution Plan (zero-breakage)

1. **Create** `src/pages/admin/AdminHub.tsx` — pure presentation, no Supabase imports, no server functions.
2. **Create** `src/routes/admin.hub.tsx`:
   ```ts
   import { createFileRoute } from "@tanstack/react-router";
   import AdminHub from "@/pages/admin/AdminHub";
   export const Route = createFileRoute("/admin/hub")({ component: AdminHub });
   ```
3. **Edit** `src/components/admin/nav/workspaceNav.ts` — swap the single Assets line and extend the `lucide-react` import with `LayoutGrid`.
4. **Verify** TypeScript build is green (`tsc --noEmit` runs automatically).
5. **Smoke check** in preview at viewport 375 × 701: bottom-nav shows "المحركات", tap routes to `/admin/hub`, scroll renders all 8 clusters with correct RTL alignment.
6. **No** edits to `routeTree.gen.ts`, `client.ts`, `types.ts`, or any Supabase file. **No** new server functions (Hub is presentation-only).

---

## 7. Constitutional Compliance Checklist

- [x] **Article 3a (No vertical knowledge in UI):** Hub registry is generic admin navigation, identical pattern to existing `workspaceNav.ts`.
- [x] **Article 5 (No direct DB):** Zero `@/integrations/supabase/client` imports in Hub.
- [x] **Article on RBAC:** Hub itself sits inside `RoleGuard` via the `/admin` shell. Per-cluster capability gating can be layered later via `useCapabilities()` mirroring `BottomTabBar`'s filter pattern — **out of scope for this wave**.
- [x] **Zero Breakage:** Only one production line of code is mutated; everything else is additive.

---

**Status:** Blueprint ready. Awaiting approval to execute the 3-file change set (1 edit + 2 creates).
