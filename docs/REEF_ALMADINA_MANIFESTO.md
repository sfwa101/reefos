# 🌾 ريف المدينة — الدستور المعماري وخارطة الطريق
### The Master Manifesto · Architectural Constitution & Unicorn Roadmap

> **الوثيقة المرجعية الدائمة** — تُلزم كل مطوّر بشري أو ذكاء اصطناعي يعمل على هذا المنتج.
> آخر تحديث: Phase 10.2 (Live Rules + Subdomain Routing مكتمل).

---

## 📜 الفهرس

1. [الوضع المعماري الحالي (Current Architecture State)](#1-الوضع-المعماري-الحالي)
2. [المبادئ الهندسية الصارمة (Core Engineering Principles)](#2-المبادئ-الهندسية-الصارمة)
3. [خارطة طريق اليونيكورن (Super App Roadmap)](#3-خارطة-طريق-اليونيكورن)

---

## 1. الوضع المعماري الحالي
### Current Architecture State (as of Phase 10.2)

### 1.1 معمارية "الخلايا الجذعية" (Stem-Cell Architecture)

كل موديول وظيفي (`supermarket`, `meat`, `kitchen`, `pharmacy`, `restaurants`, `village`, `subscriptions`, `search`...) هو **خلية جذعية مستقلة تماماً** تعيش تحت `src/modules/<name>/` بالبنية التالية:

```
src/modules/<module-name>/
  ├── <Module>Page.tsx       ← نقطة الدخول الوحيدة
  ├── components/            ← UI خاص بالموديول
  ├── hooks/use<Module>Logic.ts  ← كل منطق الحالة
  ├── types.ts               ← العقود الداخلية
  └── constants.ts           ← الثوابت الخاصة
```

**القاعدة الذهبية (Cell Membrane Rule):**
- ❌ موديول لا يستورد من موديول آخر مطلقاً (`modules/meat` → `modules/supermarket` ممنوع).
- ✅ التبادل يتم فقط عبر طبقات مشتركة: `src/context/`, `src/lib/`, `src/core/`, `src/features/`, `src/components/ui/`.
- ✅ يمكن استئصال أي موديول كاملاً (حذف المجلد) دون كسر الباقي.

### 1.2 محرك التسعير المركزي (Pricing Engine Pipeline)

`src/core/engine/pricing/` هو **المصدر الوحيد للحقيقة المالية** — أي حساب سعر، خصم، نقطة، أو رسوم يمر عبره حصرياً.

```
PricingEngine.calculate(context) →
  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
  │  Strategies │ →  │  Discounts  │ →  │   Rewards   │ →  │ Guardrails  │
  │ (per-vertical) │ │ (orthogonal) │ │  (loyalty +  │ │ (profit lock) │
  │              │  │              │  │   bonuses)   │  │              │
  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

| الطبقة | المسؤولية | أمثلة |
|---|---|---|
| **Strategies** | تسعير خاص بكل عمودي | `MeatPricingStrategy` (kg/cut), `SubscriptionPricingStrategy` |
| **Discounts** | خصومات أفقية تُطبّق على أي منتج | `LoyaltyTierDiscount`, `BulkQuantityDiscount` |
| **Rewards** | نقاط ولاء + هدايا ترويجية | `PointsEarningRule` |
| **Guardrails** | حماية الربحية وأمان النظام | `LossPreventionRule` |

**ممنوع منعاً باتاً** كتابة `* 0.95` أو `+ 25` في أي مكون UI. الحسابات تأتي من `breakdown.modifiers` فقط.

### 1.3 الحارس المالي (Loss Prevention Shield)

`src/core/engine/pricing/guardrails/LossPreventionRule.ts` هو **العقل المالي للنظام** — يطبّق ثلاث طبقات حماية:

| الطبقة | الشرط | السلوك |
|---|---|---|
| **Tier 1 — Soft Cap** | إجمالي الخصومات > 30% من السعر الأصلي | يقلّص الخصم تلقائياً للحدّ الآمن |
| **Tier 2 — Hard Lock** | صافي الربح < 10% من السعر | `discountLocked: true` + `requiresAdminApproval: true` — لا خصومات إضافية |
| **Tier 3 — Admin Override** | `context.adminOverride === true` | يكسر الأقفال + يُسجّل في `admin_override_logs` |

كل تجاوز يُسجَّل بشكل غير قابل للتعديل في `admin_override_logs` (RLS: INSERT-only لـ `has_role('admin')`).

**الحوافز الواعية بالربح (Profit-Aware Incentives):**
`useCartIncentives` لا يفتح "توصيل مجاني" أو "وجبة هدية" بمجرد بلوغ المبلغ — بل يفحص `useCartProfit().totalNetProfit` أولاً ويرفض الفتح إذا كان الهامش لا يغطي تكلفة الحافز + 5% margin.

### 1.4 محرك البحث العالمي (OMNI-Search)

`src/modules/search/` + `src/core/search/utils/arabicLogic.ts`:

- **SearchOverlay**: واجهة سينمائية بـ `useDeferredValue` لاستجابة 0ms.
- **arabicLogic**: قاموس مترادفات لغوية يفهم أن (أوطة) = (طماطم)، (عيش) = (خبز)، (بطاطس) = (بطاطا).
- **Smart Tag Suggester**: يقترح المترادفات تلقائياً على المسؤول عند إضافة منتج، وتُحفظ في `metadata.aliases`.
- **Universal Search**: يبحث عبر كل الموديولات (سوبرماركت، لحوم، صيدلية، مطاعم، وصفات...) في فهرس موحّد.

### 1.5 البنية التحتية للنطاقات (Subdomain Routing)

| النطاق | الواجهة | الحماية |
|---|---|---|
| `reefam.com` / `www.reefam.com` | متجر العميل | يطرد أي زيارة لـ `/admin/*` فوراً إلى `/` |
| `admin.reefam.com` | لوحة الإدارة | `RoleGuard('admin')` + RLS على كل جدول حساس |

التطبيق برمجياً واحد (Single Bundle) لكن `SubdomainGuard` يقرأ `window.location.hostname` ويعيد التوجيه فوراً عند أي محاولة عبور للحدود. **طبقة الدفاع الحقيقية تبقى RLS** — حتى لو تم تجاوز الـ Guard، البيانات محمية من قاعدة البيانات نفسها.

### 1.6 طبقة القواعد الحية (Live Rules — Phase 10.1)

كل قاعدة مالية قابلة للتعديل من الإدارة بدون deploy:

- `loyalty_tier_rules` → نسب خصم ومضاعفات نقاط الفئات الخمس (Bronze → VIP).
- `incentive_milestones` → سلم الحوافز (التوصيل المجاني، وجبة هدية، خصم إضافي).
- `liveRulesCache.ts` → كاش متزامن (0ms) مع Fallback مدمج لضمان عدم توقف المتجر.
- `useLiveRules` → TanStack Query مع refetch on focus + staleTime 5min.

---

## 2. المبادئ الهندسية الصارمة
### Core Engineering Principles (Non-Negotiable)

| # | المبدأ | التطبيق |
|---|---|---|
| 1 | **Zero `any`** | TypeScript صارم. أي `any` يعني تصميم خاطئ — استخدم `unknown` + type guards. |
| 2 | **Strict TypeScript** | `tsc --noEmit` يجب أن يمر بنجاح تام قبل أي merge. |
| 3 | **Zero Latency UX** | Optimistic Updates في كل تفاعل. `useDeferredValue` للبحث. `React.memo` في القوائم الطويلة. |
| 4 | **Mobile-First** | كل واجهة تُصمَّم على 375px أولاً. لوحة الإدارة تعمل من الهاتف. |
| 5 | **No Hardcoded Rules** | كل قاعدة مالية/تسويقية تأتي من DB أو Config. ممنوع `* 0.05` في الكود. |
| 6 | **Single Source of Truth** | السعر من `pricingEngine`. الدور من `user_roles`. القاعدة الحية من `liveRulesCache`. |
| 7 | **Stem-Cell Isolation** | لا تداخل بين الموديولات. التبادل عبر طبقات مشتركة فقط. |
| 8 | **Security by Default** | RLS على كل جدول. `has_role()` في كل سياسة. أدوار في جدول منفصل. |
| 9 | **Graceful Degradation** | Fallbacks في كل مكان — فشل DB لا يوقف البيع. |
| 10 | **Audit Everything** | كل تجاوز إداري + كل تغيير مالي حساس يُسجَّل في جدول immutable. |

---

## 3. خارطة طريق اليونيكورن
### The Super App Future Vision (Phases 12 → 16)

### 🔵 Phase 12 — Unified Identity & Access Management (IAM)

**الرؤية:** هوية واحدة (الرقم القومي) لكل البشر في النظام. شخص واحد يمكن أن يكون عميلاً + موظفاً + تاجراً + مديراً، ويُبدّل بين الواجهات بضغطة زر.

**المتطلبات التقنية:**
- جدول `identities` مرتبط بـ `auth.users` يحتوي `national_id` (مشفّر) + KYC status.
- جدول `user_roles` يدعم تعدد الأدوار للمستخدم الواحد (موجود بالفعل — يحتاج تفعيل UI).
- Component `<RoleSwitcher />` في الـ Header يعرض الأدوار المتاحة للمستخدم الحالي.
- Context `ActiveRoleContext` يحدد "الواجهة النشطة" حالياً (customer/vendor/employee/admin).
- Routing ديناميكي: `/` يعرض واجهة مختلفة حسب `activeRole`.
- RLS policies تستخدم `has_role(auth.uid(), 'vendor')` فعلياً لكن تأخذ في الاعتبار `activeRole` في session claims.

**Acceptance Criteria:**
- مستخدم بدور (customer + vendor) يرى زر تبديل في الـ Header.
- التبديل لا يتطلب logout/login.
- البيانات معزولة تماماً — تاجر يرى منتجاته فقط، نفس الشخص كعميل يرى السلة الشخصية فقط.

---

### 🟢 Phase 13 — B2B Wholesale (Sary Model)

**الرؤية:** واجهة موازية لتجارة الجملة. نفس قاعدة البيانات، نفس المنتجات، لكن سعر/وحدة مختلفة (كرتونة، شوال، طبلية).

**المتطلبات التقنية:**
- إضافة لـ `products`: `wholesale_price`, `wholesale_unit` (carton/sack/pallet), `wholesale_min_qty`, `units_per_wholesale`.
- Subdomain `b2b.reefam.com` أو route `/wholesale` (قرار لاحق).
- Strategy جديدة `WholesalePricingStrategy` في pricing engine.
- Context flag `isWholesaleSession` يُحدد عرض السعر بالقطعة أو بالجملة.
- KYC ملزَم: حساب جملة يتطلب رقم سجل تجاري + بطاقة ضريبية.
- جدول `wholesale_accounts` للموافقات + شروط الدفع (cash/credit 30 days).

**Acceptance Criteria:**
- تاجر جملة يرى "كرتونة عصير 24 قطعة بـ 240 ج" بدلاً من "عصير 12 ج".
- لا يستطيع شراء أقل من `wholesale_min_qty`.
- فاتورة ضريبية تلقائية بعد الطلب.

---

### 🟡 Phase 14 — Multi-Vendor Marketplace + Productive Families

**الرؤية:** تحويل المنصة من بائع واحد إلى **سوق متعدد البائعين** يشمل الأسر المنتجة والمزارع المحلية. كل طلب قد يحتوي منتجات من 5 بائعين مختلفين.

**المتطلبات التقنية:**
- جدول `vendors` (موجود — يحتاج تطوير): `commission_rate`, `payout_schedule`, `pickup_hub_id`.
- إضافة `vendor_id` لكل منتج.
- **Order Splitting Engine**: عند checkout، الطلب الواحد يُقسّم لـ `sub_orders` حسب `vendor_id`، كل sub_order له status مستقل.
- **Hub & Spoke Logistics**: 
  - جدول `pickup_hubs` (نقاط تجميع جغرافية).
  - السائق يجمع من Hubs بدلاً من زيارة كل بائع.
  - الأسرة المنتجة تسلّم في أقرب Hub، Reefam يتولى التوصيل النهائي.
- Vendor Dashboard موجود (`/vendor/*`) — يحتاج: settlements, payout requests, performance analytics.
- Commission Ledger (موجود `admin.commission-ledger`) — يحتاج تفعيل تلقائي بعد كل sub_order completion.

**Acceptance Criteria:**
- عميل يطلب 3 منتجات من 3 بائعين → يرى 3 progress bars منفصلة.
- بائع يرى dashboard طلباته فقط + رصيده + موعد التحويل التالي.
- Reefam يحصل على عمولته تلقائياً قبل تحويل الباقي للبائع.

---

### 🟣 Phase 15 — Reverse Dropshipping (Taager Model)

**الرؤية:** بوابة مسوقين — أي شخص يأخذ منتج من كتالوج Reefam، يضع هامش ربحه فوقه، يبيعه على Facebook/TikTok، Reefam تشحن باسمه ويحصل المسوّق على عمولته.

**المتطلبات التقنية:**
- جدول `marketers` + KYC مبسط.
- جدول `affiliate_links`: `marketer_id`, `product_id`, `markup_amount`, `unique_slug`, `clicks`, `conversions`.
- صفحة `/m/<slug>` تعرض المنتج بـ branding المسوّق + سعره النهائي.
- تتبع UTM تلقائي + cookies للـ attribution (30 يوم).
- نظام محفظة (`wallets` موجود) يستقبل عمولات تلقائياً عند delivery.
- خيارات سحب: تحويل بنكي، فودافون كاش، InstaPay.
- Marketer Dashboard: إحصائيات live، أكثر المنتجات مبيعاً، توقعات العمولة.

**Acceptance Criteria:**
- مسوّق يولّد رابط لمنتج بسعر 100ج + يضيف 30ج هامش → الرابط يعرض 130ج.
- زائر يشتري → الطلب لـ Reefam، المسوّق يحصل على 30ج بعد التوصيل.
- المسوّق يسحب رصيده بنقرة واحدة.

---

### 🔴 Phase 16 — Zappos CRM Protocol (Customer Obsession)

**الرؤية:** خدمة عملاء بمستوى Zappos — كل شكوى ترتفع تلقائياً، كل تأخير يُعوَّض، كل عميل يُعامل كملك.

**المتطلبات التقنية:**
- **Ticketing System:**
  - جدول `support_tickets`: `order_id`, `category`, `priority`, `assigned_to`, `sla_due_at`, `resolution`.
  - تصنيف ذكي بـ AI (Lovable AI) عند إنشاء التذكرة.
  - Escalation تلقائي: تذكرة لم تُحل خلال 2h → تنتقل لـ supervisor.
- **SLA Tracking:**
  - دقائق الاستجابة الأولى (FRT — First Response Time).
  - دقائق الحل (TTR — Time To Resolution).
  - Dashboard للمدير يعرض tickets قاربت على breach الـ SLA باللون الأحمر.
- **Multi-Dimensional Rating:**
  - بعد كل طلب: 4 تقييمات منفصلة (1-5 نجوم):
    1. جودة المنتج
    2. التغليف
    3. السائق (سرعة + لباقة)
    4. التجربة الكلية
  - تقييم < 3 نجوم في أي بُعد → ينشئ تذكرة تلقائياً.
- **Proactive Compensation:**
  - تأخير > 30min → نقاط ولاء تلقائية + اعتذار push notification.
  - Trigger في DB يحسب delays ويُصدر credits دون تدخل بشري.
- **Voice of Customer Dashboard:**
  - Sentiment analysis على نصوص التقييمات (Lovable AI).
  - Top 10 شكاوى الأسبوع → action items للإدارة.

**Acceptance Criteria:**
- عميل غاضب من تأخير → يجد 50 نقطة في محفظته قبل أن يشتكي.
- مدير يرى dashboard real-time: "3 tickets ستخرق SLA خلال 15 دقيقة".
- بائع تقييمه < 4 نجوم لأسبوعين متتاليين → ينخفض ترتيبه في الفهرس تلقائياً.

---

## 🏛️ ختام الدستور

> هذا المنتج ليس تطبيق توصيل — إنه **بنية تحتية تجارية متكاملة** لقرية رقمية تخدم العميل، التاجر، الموظف، والأسرة المنتجة في نظام واحد متناغم.
>
> أي تعديل يخالف المبادئ العشرة في القسم 2 يُعتبر **دَيناً تقنياً** يجب سداده فوراً، وليس خياراً.
>
> **القاعدة الحاكمة:** كل سطر كود يُكتب اليوم سيخدم مليون عميل غداً. اكتبه كأنك تبني هرماً.

— *Principal AI Co-Pilot, Chief Architect of Reef Almadina*
