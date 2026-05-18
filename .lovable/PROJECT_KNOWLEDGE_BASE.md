# 📘 Reef El-Madina — Project Knowledge Base
> Principal AI Co-Pilot · Phase 1.5 · وثيقة مرجعية ملزمة قبل أي قرار معماري
> آخر تحديث: 2026-05-04 · الحالة: Surgical-Mode · Hassan reviewed

---

## 1. فكرة المشروع (The Business Model)

**ريف المدينة** ليس متجراً إلكترونياً تقليدياً — إنه **نظام تشغيل تجاري متكامل (Vertical Commerce OS)** يدمج بين:

### 1.1 واجهة العميل (Storefront — 18 قسماً)
| القسم | الطبيعة | ملاحظات |
|---|---|---|
| Supermarket | منتجات استهلاكية يومية | الجذع الرئيسي للكتالوج |
| Kitchen / Recipes | مطبخ جاهز + وصفات يومية | `kitchenMenu.ts`, `subscriptionMeals.ts` |
| Dairy / Produce / Meat | طازج (perishable) | يخضع لـ `zone_availability` |
| Pharmacy | صيدلية مع حقول طبية | `metadata` polymorphic |
| Sweets | حلويات بنظام (instant + preorder + deposit) | `sweetsFulfillment.ts` |
| Restaurants | مطاعم بقوائم | `restaurants.ts` |
| Village | منتجات قروية يدوية | `villageMeta.ts` |
| Wholesale | بيع بالجملة | تسعير متدرج |
| Library / Print | إعارة كتب + طباعة | `kind: borrow/print` في السلة |
| Baskets / Subscriptions | سلال جاهزة + اشتراكات | `baskets.ts` |
| HomeGoods | أجهزة منزلية | بضمان `warranty` |

### 1.2 محركات أعمال متقدمة (Business Engines)
- **Group Buy** (`features/group-buy`): شراء جماعي بأسعار متدرجة (`group_buy_campaigns/tiers/pledges`).
- **Affiliate / Referrals**: نظام إحالة بكوميشن (`referrals`, `referral_codes`, `affiliate_settings`, `commission_ledger`).
- **Wallet Ecosystem**: محفظة + Savings Jar + Trust Limit + Sub-accounts + Top-up approvals + Transfers + Charity + Zakat.
- **Hakim AI Advisor** (Edge Functions): مستشار ذكي + Anomaly detection + Pulse monitoring.
- **POS** (`features/pos`): نقطة بيع داخلية كاملة بـ shifts + barcode + quick-pay.
- **Vendor Multi-tenant**: بائعون مستقلون مع settlements + payouts + commission.
- **Driver System**: سائقون مع cash settlements + commission rules + map + tasks.
- **SDUI** (`features/sdui`): Server-Driven UI — تخطيطات الواجهة من DB (`ui_layouts`, `ui_layout_history`).

### 1.3 لوحة الإدارة (Admin — 71 صفحة)
ERP حقيقي: Inventory, Branches, Warehouses, Suppliers, Purchase Invoices, Cost Bulk, Cross-Branch Transfers, Product Batches, Cashier Sessions, CFO/Executive Dashboards, KYC, Riba Audit, Zakat, Charity, Staff Attendance/Advances, Role Permissions, Geo Zones, Delivery Settings, Marketing (Banners/Promos/Notifications/Referrals).

**الخلاصة:** هذا ليس "متجر" — هذا **منصة Multi-Sided Marketplace + Internal ERP + Fintech Wallet + AI Layer**.

---

## 2. الخريطة الجينية للملفات (Architecture & File Map)

### 2.1 الطبقات الكبرى
```
src/
├── routes/         ← TanStack Router (file-based, 94 routes) — NO logic, just route → component bridges
├── pages/          ← الصفحات الفعلية (admin/, store/, account/, driver/, vendor/) — تستهلك hooks + features
├── features/       ← خلايا جذعية (Stem Cells) — كل ميزة كاملة بنفسها
├── components/     ← مكونات مشتركة عابرة للميزات (AppShell, TabBar, ProductCard, sheets/)
├── context/        ← React Contexts عالمية (Auth, Cart, Theme, Location, UI, Favorites, Compare, SharedCart)
├── hooks/          ← Hooks عامة (useUserRole, useGeoZones, useMarketing, useSystemSettings, useProductsQuery)
├── lib/            ← ⚠️ ليست "data" — هذه طبقة **Domain Logic + DAL** كاملة
├── integrations/   ← Supabase client + types (auto-generated) + auth-middleware
└── styles.css      ← Tailwind v4 + design tokens (oklch)
```

### 2.2 وظيفة `src/lib/` الحقيقية (تصحيح كبير)
> ❌ **ليست مجرد بيانات صلبة** — كانت هذه الافتراض الكارثي للتقرير الأول.
> ✅ هي **Domain Layer + Data Access Layer + Pricing Engine + Sync Engine**.

تصنيف الملفات حسب الطبيعة الحقيقية:

| النوع | الملفات | لا يجوز حذفها |
|---|---|---|
| **DAL (يقرأ من DB)** | `products.ts` (280s — cache + realtime + 4 hooks)، `restaurants.ts`، `library.ts`، `baskets.ts`، `geoZones.ts` | 🚨 **SPOF** — كسرها = انهيار 50+ ملف |
| **Domain Engines** | `pricingEngine.ts` (266s — Modifier system للسلة)، `pricingAdapters.ts`، `butcheryPrep.ts`، `sweetsFulfillment.ts`، `subscriptionMeals.ts`، `volumeDeals.ts`، `smartPairs.ts`، `personalize.ts`، `behavior.ts`، `tiers.ts`، `buyAgain.ts` | منطق أعمال نقي |
| **UI Helpers** | `supermarketTaxonomy.ts` (matchers + colors + emojis)، `storeThemes.ts`، `productImages.ts` (431s — Unsplash mappings)، `productEnrichment.ts`، `villageMeta.ts`، `kitchenMenu.ts` | UI metadata، ليست DB |
| **Sync / Infra** | `cartSync.ts` (cart ↔ DB merge)، `sync/useSmartLogistics.ts`، `confetti.ts`، `format.ts`، `pwa.ts`، `whatsapp.ts`، `utils.ts`، `favorites.ts` | بنية تحتية |
| **Seed (one-shot)** | `megaSeed.ts` (430s — `runMegaSeed()`، **لا يُستدعى تلقائياً**)، `products.fallback.ts` (64s — fallback عند فشل DB) | تشغّل يدوياً من Admin |

### 2.3 وظيفة `src/features/` — معمارية الخلايا الجذعية
كل ميزة = خلية مكتفية ذاتياً تحوي `components/`, `hooks/`, `types/`, أحياناً `lib/`:

```
features/
├── account/profile/      ← الملف الشخصي (data + types + utils + components)
├── admin/                ← marketing/, product-editor/, components, hooks (LayoutEditor, PurchaseInvoice)
├── cart/                 ← components + hooks + types (السلة UI، المنطق في context)
├── driver/               ← driver engine + components + types
├── group-buy/            ← Pledge Dialog + Ticker + engine + types  ⭐ ميزة مميزة
├── hakim/                ← AI Advisor (PulseMonitor + edgeWorker hook)
├── library/              ← Borrow + Print Wizard + KYC Gate + Bundles
├── main-hub/             ← Home Hub (DepartmentGrid, PromotionSlider, StoryCircles, SearchHeader)
├── meat/                 ← CutBuilder + PrepOptions + Panel
├── pharmacy/             ← components + data + types (medical fields)
├── pos/                  ← POS engine + Barcode + QuickPay + Shift
├── product-detail/       ← PDP blocks (Gallery, StickyCTA, Pharmacy/Village blocks)
├── recipes/              ← Daily/Weekly + Modal + data
├── sdui/                 ← Server-Driven UI (SectionFrame + registry)
├── storefront/           ← home/ + components/ (StoreCategoryGrid)
├── sweets/               ← FulfillmentSelector + VariantPicker + Customization
├── vendor/               ← Operations + Settlement + Inventory + LiveOrders + types
└── wallet/               ← أكبر ميزة: 15 component + 6 hook + lib + types
```

**القاعدة:** الميزة لا تعرف عن ميزة أخرى مباشرة — تتحدث فقط عبر `context/`، `lib/`، أو `hooks/` العامة.

---

## 3. خريطة تدفق البيانات (Data Flow & State)

### 3.1 المنتجات (Products) — طبقتان متوازيتان تشاركان نفس `fetchAll`

```
                    ┌──────────────────────────────────┐
                    │  Supabase  →  products table     │
                    │  (139 منتج + realtime channel)   │
                    └────────────┬─────────────────────┘
                                 │ fetchAll() — مرة واحدة
                                 ▼
                ┌────────────────────────────────────────┐
                │  src/lib/products.ts                   │
                │  ─ in-memory `cache: Product[]`        │
                │  ─ listeners (Set<()=>void>)           │
                │  ─ realtime subscription (postgres_*)  │
                │  ─ visibilitychange/focus/online refetch│
                │  ─ products.fallback.ts عند الفشل      │
                └────────────┬───────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    Sync helpers       React Hooks       TanStack Query
    products[]         useProducts()     useProductsQuery()
    getById()          useProduct()      useProductQuery()
    bySource()         useProductsBy     useProductsBy
    bySourceAndCat()   Source()          SourceQuery()
                       useProductsVer()  
    (~50 ملف يستخدمها) (الواجهات الجديدة) (Suspense + SWR)
```

- **الـ Cache واحد**، الطبقتان (sync + TanStack) تشاركانه — لا double-fetch.
- **57 ملف** يستورد من `@/lib/products` مباشرة (تحقق فعلي).
- **Realtime** يحدّث الكاش عند أي insert/update/delete من Admin Panel.
- **SSR Safety**: `isBrowser` guard يمنع تلوث الكاش بين requests.

### 3.2 السلة (Cart) — أعقد قطعة في النظام

```
src/context/CartContext.tsx  (430 سطراً — SPOF كامل)
├── useSyncExternalStore       ← read-side عالي الأداء
├── localStorage persistence   ← offline-first
├── Modifier system            ← من pricingEngine.ts (Universal Commerce Engine Phase 3)
│   ├── appliedModifiers[]     ← الطريقة الجديدة (meat cuts, sweets variants, library borrow)
│   └── legacy fields          ← bookingDate, printConfig, shipMode... (للترحيل)
├── kind: "buy" | "borrow" | "print"
├── trackBuyAgain + logBehavior ← side-effects
└── cartSync.ts                ← مزامنة محلي ↔ cart_items table عند تسجيل الدخول
                                   (fetchRemoteCart + pushRemoteCart + mergeCarts)

السلة المشتركة (Shared Cart):
src/context/SharedCartContext.tsx  ← يخزن activeSharedCartId في localStorage
└── shared_carts + shared_cart_items + shared_cart_participants (DB)
```

**ملفات تتحكم في السلة (لا تلمس بدون مراجعة):**
1. `src/context/CartContext.tsx` — الحالة والـ API
2. `src/lib/cartSync.ts` — DB merge logic
3. `src/lib/pricingEngine.ts` — Modifier evaluation
4. `src/lib/pricingAdapters.ts` — section → Modifier converters
5. `src/features/cart/` — UI فقط
6. `src/components/desktop/CartPanel.tsx`, `src/pages/Cart.tsx` — العرض

### 3.3 Contexts العالمية (8)
| Context | المهمة | يقرأ من |
|---|---|---|
| `AuthContext` | Supabase session + user | supabase.auth |
| `CartContext` | السلة + Modifiers | localStorage + cart_items |
| `SharedCartContext` | معرف السلة الجماعية | localStorage + shared_carts |
| `FavoritesContext` | المفضلة | localStorage + favorites table |
| `CompareContext` | مقارنة منتجات | localStorage |
| `LocationContext` | الموقع + zone | localStorage + geo_zones |
| `ThemeContext` | dark/light + section themes | localStorage |
| `UIContext` | global UI flags (drawers, modals) | memory only |

### 3.4 Database (97 جدول)
**كتل وظيفية:**
- **Catalog**: products, categories, product_variants, product_units, product_batches, units_of_measure, suppliers
- **Orders**: orders, order_items, sub_orders, order_outbox, cart_items, shared_carts*
- **Wallet**: wallet_balances, wallet_transactions, wallet_sub_accounts, wallet_topup_requests, savings_jar, savings_transactions, driver_wallets, vendor_wallets, vendor_wallet_transactions
- **Identity**: profiles, user_roles, role_permissions, permissions, kyc_verifications, addresses
- **Affiliate**: referrals, referral_codes, affiliate_settings, affiliate_tiers, commission_ledger, user_affiliate_state
- **Group Buy**: group_buy_campaigns, group_buy_tiers, group_buy_pledges
- **Marketing**: banners, coupons, coupon_redemptions, discounts, discount_overrides, flash_deals, flash_sales, flash_sale_products, mega_events, notifications
- **Operations**: branches, warehouses, stores, vendors, drivers, delivery_tasks, delivery_events, delivery_settings, geo_zones, zone_availability, inventory_locations, cross_branch_transfers, purchase_invoices, purchase_items, daily_expenses, pos_shifts, cashier_sessions, print_jobs, product_partners, partner_ledgers, store_settlements, vendor_payouts, vendor_payout_requests, user_payout_requests, driver_cash_settlements, driver_commission_rules
- **AI/Audit**: hakim_chat_sessions, hakim_chat_messages, hakim_insights, hakim_anomalies, audit_logs, riba_audit_log
- **Charity/Zakat**: charity_campaigns, charity_donations, charity_ledger, charity_rules, zakat_assessments
- **HR**: staff_attendance, staff_advance_requests
- **Misc**: reviews, support_tickets, user_behavior_logs, user_preferences, category_budgets, app_settings, ui_layouts, ui_layout_history

**Roles**: admin, vendor, driver, customer, cashier (محفوظة في `user_roles` — ✅ منفصلة، آمنة من escalation).

---

## 4. الاعتماديات الخطرة (Critical Dependencies / SPOF)

> ⚠️ كسر أي ملف من هذه = انهيار شامل أو تدهور صامت.
> أي تعديل عليها يجب أن يكون **جراحياً + مدعوماً بـ test path يدوي**.

| الملف | الخطورة | لماذا | مستهلكون |
|---|---|---|---|
| `src/lib/products.ts` | 🔴 SEV-0 | DAL + cache + realtime + 4 hooks لكل المنتجات | **57 ملف** |
| `src/context/CartContext.tsx` | 🔴 SEV-0 | السلة + Modifiers + persistence + DB sync | كل الـ checkout flow |
| `src/lib/pricingEngine.ts` | 🔴 SEV-0 | Modifier evaluation — كسرها = أسعار خاطئة | meat, sweets, library, recipes, baskets |
| `src/integrations/supabase/client.ts` | 🔴 SEV-0 | client مفرد + auth | كل الـ DB access |
| `src/integrations/supabase/types.ts` | 🔴 SEV-0 | Generated types — لا تُحرّر يدوياً | كل query في النظام |
| `src/context/AuthContext.tsx` | 🔴 SEV-0 | الجلسة + user.id | كل صفحة محمية |
| `src/lib/cartSync.ts` | 🟠 SEV-1 | merge logic بين localStorage و DB | login flow |
| `src/lib/pricingAdapters.ts` | 🟠 SEV-1 | يحوّل اختيارات الأقسام لـ Modifiers | meat/sweets/library sheets |
| `src/lib/geoZones.ts` | 🟠 SEV-1 | يحدد ما يمكن شحنه (perishables) | كل add-to-cart |
| `src/routes/__root.tsx` + `src/router.tsx` | 🔴 SEV-0 | TanStack bootstrap | كل التطبيق |
| `src/integrations/supabase/auth-middleware.ts` | 🟠 SEV-1 | حماية routes | admin/, vendor/, driver/ |
| `src/hooks/useUserRole.ts` | 🟠 SEV-1 | يحدد admin/vendor/... | كل guards |
| `src/lib/products.fallback.ts` | 🟡 SEV-2 | shock-absorber لما DB يفشل | UX حرج عند الـ outage |

### 4.1 ملفات تبدو خطرة لكنها آمنة للحذف/إعادة البناء
- `src/lib/megaSeed.ts` — يُشغَّل يدوياً فقط من Admin؛ حذفه لا يكسر الواجهة (لكن يفقد القدرة على إعادة الـ seed).
- `src/lib/productImages.ts` — Unsplash mappings؛ استبداله = استبدال الصور فقط.
- `src/lib/supermarketTaxonomy.ts` — UI metadata (colors/emojis/matchers)؛ مستخدم في 2 ملفات فقط.

---

## 5. القرارات المعمارية الملزمة (Binding Decisions)

1. **🚫 لا حذف لـ `src/lib/products.ts`** — هي DAL، ليست data. أي ترحيل لـ TanStack Query يكون **بالإضافة**، ليس بالاستبدال.
2. **🚫 لا تفريغ لـ `megaSeed.ts`** قبل توفير بديل (Admin UI لإضافة منتجات بالجملة).
3. **🚫 لا نقل صور Unsplash → Storage** الآن (Phase 2 — يحتاج 10+ تعديلات frontend).
4. **✅ `categories` table مسؤولة عن التصنيف الهرمي** (14 مجموعة + 64 sub) بعد Migration الخطوة 1. الكود يعتمد عليها أولاً مع `supermarketTaxonomy` كـ fallback UI.
5. **✅ السلة Universal Commerce Engine Phase 3**: كل الأقسام تنتقل لـ `appliedModifiers[]`. الحقول القديمة (bookingDate/printConfig…) تُترك للترحيل التدريجي.
6. **✅ معمارية الخلايا الجذعية**: ميزة جديدة = مجلد جديد في `features/` بـ components+hooks+types. لا منطق أعمال في `pages/` أو `routes/`.
7. **✅ Mobile-First مطلق** — viewport الحالي 375x716 (الجوال).

---

## 6. ما الذي تم إنجازه فعلياً (Phase 1 — Confirmed)

- ✅ Migration `20260503224408_*.sql`: `product_variants` table + `categories` (14+64) + backfill `products.category_id` (139/139).
- ✅ `useProductsQuery.ts` — TanStack Query layer فوق `products.ts` (لا double-fetch).
- ✅ DB schema dump (97 جدول + RLS policies + functions).
- ✅ إصلاح Theme Pollution + شاشة بيضاء + RLS الطلبات للـ admin (الجلسة السابقة).

---

## 7. ما لم يُنفّذ (وقفنا عمداً)

- ⏸️ تفريغ `products.ts` / `megaSeed.ts` / `supermarketTaxonomy.ts` — **مؤجل/مرفوض** لأن الافتراض الأصلي كان خاطئاً (هذه ليست بيانات صلبة).
- ⏸️ Step 3 (تفريغ ملفات seed) — يحتاج بديلاً قبل الحذف.
- ⏸️ نقل `products.variants` JSONB → `product_variants` table — يحتاج refactor لـ ~10 ملفات frontend.
- ⏸️ نقل صور Unsplash → Supabase Storage.

---

## 8. القواعد الذهبية للجلسات القادمة

1. **اقرأ هذه الوثيقة قبل أي اقتراح معماري.**
2. لا تثق بأي تقرير "audit" يتجاهل عدد المستهلكين الفعلي لملف.
3. قبل اقتراح حذف ملف: `grep -r "from .*<filename>" src` لمعرفة المستهلكين.
4. أي تعديل على SPOF (الجدول §4) يتطلب موافقة Hassan الصريحة.
5. الأولوية دائماً: **(1) لا كسر — (2) Mobile-First — (3) توفير Credits — (4) جمال الكود**.

---
> نهاية الوثيقة. اقترح التحديث عليها كلما تغير فهم أساسي للمشروع.

---

# 📗 ملحق Khalil — حالة المجال السيادي (محدّث: 2026-05-18)

> هذا الملحق أُضيف لأن الوثيقة الأصلية تسبق إطلاق مجال **Khalil**.  
> Khalil = مجال "التحوّل الشخصي السيادي" — منفصل تماماً عن Reef El-Madina، يعيش تحت `src/core/khalil/` و `src/apps/khalil/`.  
> القاعدة: **لا cross-domain imports**، لا Supabase مباشر من UI، كل شيء عبر Gateways + Capabilities + Events.

## خط الزمن الكامل للمراحل

| المرحلة | العنوان | الحالة | التقرير المرجعي |
|---|---|---|---|
| P0   | Governance scaffolding | ✅ مكتمل | `.salsabil/domains/khalil/DOMAIN_MEMORY.md` |
| P0.1 | Maeen ↔ Khalil decoupling | ✅ | `p0.1-boundary-correction.md` |
| P1   | MVP architecture (ADR-0004) | ✅ | `p1-mvp-blueprint.md` |
| P2.1 | Foundation (events/gateway/i18n) | ✅ | `p2.1-foundation-report.md` |
| P2.2 | Prayer pillar | ✅ | `p2.2-prayer-report.md` |
| P2.3 | Habit pillar | ✅ | `p2.3-habit-report.md` |
| P2.4 | Recovery state machine | ✅ | `p2.4-recovery-report.md` |
| P2.5 | Identity engine | ✅ | `p2.5-identity-report.md` |
| P2.6 | Sovereign AI Coach (propose/dispose) | ✅ | `p2.6-coach-report.md` |
| P2.7 | Workout + Weight + Analytics | ✅ | `p2.7-body-analytics-report.md` |
| P2.8 | Replay/offline/governance hardening | ✅ | `p2.8-beta-readiness.md` |
| P3.1 | Sovereign Intelligence Layer | ✅ | `p3.1-sovereign-intelligence-report.md` |
| **P3.2** | **Sovereign Missions & Adaptive Journeys** | ⚠️ **قيد التنفيذ — لم يكتمل** | (لم يُكتب بعد) |

## P3.2 — ما تم فعلاً

**منفّذ:**
- Migration: جداول `khalil_mission`, `khalil_mission_event`, `khalil_daily_journey` (append-only + RLS + triggers).
- محرك المهمات السيادي (PURE): `src/core/khalil/missions/{contracts,types,scoring,adaptation,planner,selectors,engine,replay}.ts`.
- Determinism مضمون عبر FNV-1a و threading لـ `now` من الـ caller.
- Gateways + Capabilities: `khalil.missions.read/accept/recompute/journey`.
- صفحات + Routes: `/khalil/missions`, `/khalil/journey`.
- Blocks: `MissionBlocks.tsx` (Primary, Secondary, Journey Today, Identity Momentum).
- Governance tripwire: `scripts/khalil-missions-governance.mjs`.
- اختبارات determinism + adaptation rules.

**معلّق (لم يُنفّذ بعد):**
- إصلاح 3 أخطاء implicit-any في `MissionBlocks.tsx`.
- تسجيل blocks الجديدة في `src/apps/khalil/blocks/register.tsx`.
- ربط المهمّات بـ `composeKhalilHome` orchestrator.
- مفاتيح i18n لجميع نصوص المهمّات/الرحلة.
- توسيع `src/core/khalil/events.ts` بأحداث lifecycle.
- كتابة تقرير `p3.2-missions-report.md` وتصدير الحزمة إلى `/mnt/documents/khalil-mvp/`.
- خطّافات التحضير لـ P3.3 (long-term arcs / seasonal plans / elite mode / symbolic memory / recovery forecast).

## القواعد الذهبية لـ Khalil (مُلزمة لأي جلسة قادمة)

1. **لا** استيراد cross-domain (`@/core/reef-*`, `@/core/commerce`, …) — التواصل عبر events + capabilities فقط.
2. **لا** `supabase` من UI — Gateways حصراً.
3. **لا** عشوائية ولا `Date.now()` ولا `new Date()` داخل `src/core/khalil/**` PURE — مرّر `now` كـ ISO من الـ caller.
4. كل قدرة جديدة تُسجَّل في `CapabilityRegistry` في نفس الـ patch.
5. كل event/projection append-only — replay يجب أن يبني نفس الـ digest بايت-ببايت.
6. كل النصوص الظاهرة عبر `kt()` — لا hardcoded Arabic داخل `.tsx`.

> نهاية ملحق Khalil. حدِّث هذا القسم كلما اكتملت مرحلة جديدة.
