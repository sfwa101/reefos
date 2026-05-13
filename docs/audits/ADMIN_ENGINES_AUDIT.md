# ADMIN ENGINES & LEGACY POLLUTION — Topographical Audit

**Mode:** READ-ONLY. Factual mapping. No code modifications.
**Scope:** `src/routes/admin.*`, `src/pages/admin/*`, `src/components/admin/*`, all data hooks touching `usa_products` / `salsabil_assets`.

---

## 1. Admin Routing & Navigation Map

### 1.A — Routes related to PRODUCT / ASSET / INVENTORY

| Route file | URL | Mounts (page component) | Purpose |
|---|---|---|---|
| `admin.assets.index.tsx` | `/admin/assets` | `pages/admin/UsaLedger.tsx` | ✅ **TRUE Sovereign Asset Ledger** (`salsabil_assets`) |
| `admin.assets.genesis.tsx` | `/admin/assets/genesis` | inline `GenesisPage` | ✅ Vision-based asset creation (mints into `salsabil_assets` via `useMintUSA`) |
| `admin.products.new.tsx` | `/admin/products/new` | `<Navigate to="/admin/assets/genesis" replace />` | ✅ Already a redirect shim — safe |
| `admin.product-units.tsx` | `/admin/product-units` | `pages/admin/ProductUnits.tsx` | ⚠️ Legacy "المنتجات" link target. Reads `product_units` via `admin-catalog.functions.ts`; assumes legacy `products` table shape (`{id,name,price}`) |
| `admin.product-batches.tsx` | `/admin/product-batches` | `pages/admin/ProductBatches.tsx` | ⚠️ FEFO batches grid keyed by `product_id` (legacy product) |
| `admin.inventory.tsx` | `/admin/inventory` | `pages/admin/Inventory.tsx` | ⚠️ "المخزون" — uses `fetchAdminCatalog` from `lib/sovereignCatalog.ts` (already on `salsabil_assets`); BUT presents as a separate price/stock editor parallel to USA Ledger |
| `admin.inventory-locations.tsx` | `/admin/inventory-locations` | `InventoryLocations` | Warehouse/location CRUD (orthogonal — keep) |
| `admin.low-stock.tsx` | `/admin/low-stock` | `LowStock` | Alert view (orthogonal — keep) |
| `admin.cost-bulk.tsx` | `/admin/cost-bulk` | `CostBulk` | Bulk cost editor (overlap with Ledger inline-edit) |
| `admin.$entity.tsx` + `admin.$entity.$id.tsx` | `/admin/:entity[/:id]` | `AdminTableEngine` / `AdminFormEngine` (SDUI) | ✅ Generic dynamic-entity engine — unused by hub, but reachable |

### 1.B — "المنتجات" vs "الأصول" pointers

| Surface | Label | Points to |
|---|---|---|
| `components/admin/nav/workspaceNav.ts` (sidebar/bottom-tabs, `REEF` group) | "الأصول" | `/admin/assets` ✅ |
| `components/admin/nav/workspaceNav.ts` | "منتج جديد بحكيم" | `/admin/assets/genesis` ✅ |
| `pages/admin/AdminHub.tsx` (cluster `ops`) | **"المنتجات"** | `/admin/product-units` ⚠️ legacy |
| `pages/admin/AdminHub.tsx` (cluster `ops`) | **"الأصول"** | `/admin/assets` ✅ |
| `pages/admin/AdminHub.tsx` (cluster `ops`) | "منتج جديد بحكيم" | `/admin/products/new` (→ redirects to genesis) ✅ |
| `pages/admin/AdminHub.tsx` (cluster `ops`) | "المخزون" | `/admin/inventory` ⚠️ overlap |

**Finding:** The sidebar (workspaceNav) is already clean — only `assets` + `genesis` + `hub`. The pollution is concentrated in the **AdminHub `ops` cluster**, which exposes BOTH "المنتجات" (→ legacy `product-units`) AND "الأصول" (→ USA Ledger) as siblings, plus an "المخزون" page that re-edits SKU price/stock outside the Ledger.

### 1.C — Engines Hub structure (`/admin/hub` → `pages/admin/AdminHub.tsx`)

8 clusters, ~75 destinations:

```text
ops           → Orders, المنتجات(legacy), الأصول(USA), منتج جديد بحكيم, المخزون,
                 مواقع المخزون, نقص المخزون, تحويلات بين الفروع, مراقبة التخصيص,
                 التصنيفات, التوصيل, إعدادات التوصيل, مهام الطباعة            (13)
commerce      → المتاجر, الفروع, العملاء, الشبكة البشرية, التقييمات, الدعم,
                 اقتراحات مخصصة                                                  (7)
marketing     → مركز التسويق, البانرات, العروض الترويجية, الإشعارات, الإحالات,
                 العروض, إعدادات الشراكة                                        (7)
finance       → 21 destinations (wallets, payouts, expenses, ledger, CFO,
                 executive, savings, payments-schedule, purchases, cost-bulk,
                 discount-overrides, commissions, partner ledgers, partners,
                 suppliers, driver settlements ×2, store settlements,
                 topup approvals)                                              (21)
hr            → الموظفون, الحضور, السلف, اعتمادات السلف, جلسات الكاشير, KYC    (6)
compliance    → الزكاة, الصدقات, مراجعة الربا, الخزانة السيادية, لوحة التحكم,
                 التتبع, مراقبة الأرباح, سجل العمليات, الصلاحيات                (9)
hakim         → حكيم, محادثة, الرؤى, الشذوذ, المهندس, تقارب التصنيفات,
                 التحليلات, لوحة التشغيل, قواعد العمل                          (9)
system        → الإعدادات, التصميم, السيستم, ...
```

The Hub is **pure presentation** (no Supabase imports) — confirmed Article 5 compliant. All pollution is in the **target pages**, not the Hub itself.

---

## 2. Data-Pipeline Audit (Admin Domain)

### 2.A — Pages/hooks that hit the **deleted `usa_products`** table

| File | Line(s) | Severity |
|---|---|---|
| `src/core/catalog/service/catalog.functions.ts` | 310, 355, 442, 497 | 🔴 CRITICAL — service-layer reads/writes still target dropped table |
| `src/core/catalog/hooks/useSectionSubcategories.ts` | 34 | 🔴 storefront subcategory hook |

> Note: ZERO admin **page** files (`src/pages/admin/*`) directly query `usa_products`. The pollution lives one level down in the catalog service that several admin paths transitively depend on.

### 2.B — Files that hit the canonical **`salsabil_assets`** table

| File | Role |
|---|---|
| `src/lib/sovereignCatalog.ts` (×7 references) | ✅ Canonical admin catalog gateway |
| `src/hooks/useProductsQuery.ts` (×2) | ✅ Storefront hook |
| `src/lib/ops.functions.ts` | ✅ Order-line asset enrichment |
| `src/core/catalog/service/catalog.functions.ts` (×2) | ⚠️ Mixed — some methods `salsabil_assets`, others `usa_products` |
| `src/apps/reef-al-madina/features/vendor/hooks/useVendorOperations.ts` | ✅ |
| `src/pages/admin/UsaLedger.tsx` (via `dataSource.table`) | ✅ Single source of truth UI |

### 2.C — Admin pages cross-referenced to backing table

| Admin page | Backing data | Verdict |
|---|---|---|
| `UsaLedger.tsx` | `salsabil_assets` (+ `salsabil_skus` + `salsabil_financial_contracts`) | ✅ KEEP — the One True Ledger |
| `Inventory.tsx` | `salsabil_assets` (via `fetchAdminCatalog`) | ⚠️ Functionally OK, but UX-redundant with Ledger inline edit |
| `ProductUnits.tsx` | `product_units` table; assumes legacy `products` shape for parent select | 🔴 Legacy — duplicates a concept now expressed by `salsabil_skus` |
| `ProductBatches.tsx` | `product_batches` keyed by `product_id` | 🔴 Legacy product FK |
| `LowStock.tsx`, `InventoryLocations.tsx`, `CrossBranchTransfers.tsx`, `AllocationMonitor.tsx`, `CostBulk.tsx` | inventory-side tables | Orthogonal (warehouse logic) — out of unification scope |

---

## 3. Morph / Stem-Cell UI Audit

Three rendering layers exist for admin lists:

1. **`UniversalAdminGrid`** (`src/components/admin/UniversalAdminGrid.tsx`)
   - Bento-metrics + Column<T> + RowAction<T>; consumes `dataSource: { table, select, orderBy, searchKeys, map }` and queries Supabase directly client-side.
   - Used by: `UsaLedger`, `ProductBatches`, `Customers`, `Orders`, `Wallets`, `Reviews`, etc.
   - **Status:** the de-facto stem-cell — but bypasses gateways (Article 3 violation, see `ADMIN_CONSTITUTIONAL_AUDIT.md` §1a).

2. **`AdminTableEngine`** (`src/core-os/sdui-engine/admin/engine/AdminTableEngine.tsx`)
   - SDUI-driven, schema-from-DB, server-paginated `.range()`, virtualized via `@tanstack/react-virtual`.
   - Wired ONLY through `admin.$entity.tsx`; not used by any concrete page.
   - **Status:** the architecturally correct stem-cell; idle.

3. **Hand-rolled `<table>` / `useState` lists** — `Inventory.tsx`, `ProductUnits.tsx`, `ProductBatches.tsx` (composes UAG), various finance pages.

**Conclusion:** Two competing "universal" grids exist (`UniversalAdminGrid` widely used, `AdminTableEngine` correct-but-unused). Unification target should be `AdminTableEngine` long-term; short-term consolidation can ride on `UniversalAdminGrid`.

---

## 4. Surgical Unification Blueprint

### 4.A — Pages scheduled for DELETION (legacy product pollution)

| Path | Reason | Notes |
|---|---|---|
| `src/pages/admin/ProductUnits.tsx` + `src/routes/admin.product-units.tsx` | Concept replaced by `salsabil_skus` editable in USAEditor | Remove "المنتجات" link from `AdminHub` |
| `src/pages/admin/ProductBatches.tsx` + `src/routes/admin.product-batches.tsx` | FEFO batches must be migrated to a SKU-anchored table OR exposed as a tab inside USAEditor → defer until batch-migration wave; for now mark as legacy |
| `src/routes/admin.products.new.tsx` | Already a redirect shim — can be deleted once internal links updated | Safe to keep as a compatibility shim |

### 4.B — Pages to DEMOTE / merge into the Ledger

| Page | Action |
|---|---|
| `Inventory.tsx` (`/admin/inventory`) | Convert to a **filter view** of `UsaLedger` (e.g. `?focus=stock`) OR expose stock/price inline editors inside the existing Ledger row click → USAEditor. Remove "المخزون" hub tile. |
| `CostBulk.tsx` (`/admin/cost-bulk`) | Move into Ledger as a multi-select toolbar action. |

### 4.C — The ONE TRUE Sovereign Asset Ledger

```text
Route file : src/routes/admin.assets.index.tsx
Page       : src/pages/admin/UsaLedger.tsx
Editor     : src/apps/reef-al-madina/features/admin/usa-editor/USAEditor.tsx
Genesis    : src/routes/admin.assets.genesis.tsx (inline GenesisPage)
Backing    : salsabil_assets ⨝ salsabil_skus ⨝ salsabil_financial_contracts
Grid       : UniversalAdminGrid (current) → migrate to AdminTableEngine (future)
```

### 4.D — Hub cleanup (single edit to `pages/admin/AdminHub.tsx`)

Remove from `ops` cluster:
- ❌ `{ to: "/admin/product-units", label: "المنتجات" }`
- ❌ `{ to: "/admin/inventory", label: "المخزون" }` (or relabel + point to `/admin/assets`)

Keep in `ops`:
- ✅ `{ to: "/admin/assets", label: "الأصول" }`  ← rename to "المنتجات والأصول"
- ✅ `{ to: "/admin/assets/genesis", label: "منتج جديد بحكيم" }`

### 4.E — Service-layer follow-up (not part of UI unification, but blocking)

`src/core/catalog/service/catalog.functions.ts` still references `usa_products` on lines 310/355/442/497 — must be repointed to `salsabil_assets` BEFORE deletion of legacy pages, otherwise downstream reads will crash. Same for `src/core/catalog/hooks/useSectionSubcategories.ts:34`.

---

## 5. Summary

| Question | Answer |
|---|---|
| Where does "المنتجات" point? | `AdminHub` ops cluster → `/admin/product-units` (LEGACY page hitting `product_units` + assumed `products` shape) |
| Where does "الأصول" point? | Both `workspaceNav` and `AdminHub` → `/admin/assets` → `pages/admin/UsaLedger.tsx` (canonical `salsabil_assets`) |
| Engines Hub structure | 8 clusters, ~75 links, pure presentation, in `pages/admin/AdminHub.tsx` |
| Pages to delete | `ProductUnits`, `ProductBatches` (and their routes); demote `Inventory` + `CostBulk` |
| One True Ledger | `src/pages/admin/UsaLedger.tsx` mounted at `/admin/assets` |
| Blocking dependency | `catalog.functions.ts` still queries dropped `usa_products` — repoint first |

**Audit complete. Standing by for the unification order.**
