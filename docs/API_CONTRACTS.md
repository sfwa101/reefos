# 📡 عقود الـ API — Reef Almadina API Contracts

> توثيق شامل للأسطح العامة (Public Surfaces) للنظام: server functions، webhooks، الجداول العامة، والقواعد القابلة للتعديل.
> أي تغيير على هذه العقود يستوجب ADR + bump في الإصدار.

**Version:** 1.0.0 · **Last updated:** Phase 10.2

---

## 📋 الفهرس

1. [مبادئ التصميم](#1-مبادئ-التصميم)
2. [Server Functions (createServerFn)](#2-server-functions)
3. [Public HTTP Endpoints](#3-public-http-endpoints)
4. [Edge Functions](#4-edge-functions)
5. [Pricing Engine Contract](#5-pricing-engine-contract)
6. [Live Rules Contract](#6-live-rules-contract)
7. [Database Tables — Public API](#7-database-tables)
8. [RLS Policy Patterns](#8-rls-policy-patterns)
9. [Versioning & Deprecation](#9-versioning--deprecation)

---

## 1. مبادئ التصميم

| المبدأ | التطبيق |
|---|---|
| **Type-Safe** | كل عقد له TypeScript interface مُصدَّر |
| **Validated** | كل input يمر عبر Zod في `inputValidator()` |
| **Versioned** | breaking change = endpoint جديد، ليس تعديل |
| **Auditable** | عمليات حساسة تُسجَّل في جداول immutable |
| **RLS-Backed** | الحماية الحقيقية في DB، ليس في الكود |

---

## 2. Server Functions

> الموقع: `src/server/*.functions.ts`
> الاستدعاء: من components مباشرة، type-safe، يمر عبر `requireSupabaseAuth` middleware عند الحاجة.

### 2.1 نمط القراءة المحمية (Authenticated Read)

```typescript
// Contract
export const getMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Order[]> => {
    const { supabase, userId } = context;
    // ...
  });

// Caller
const orders = await getMyOrders();
```

| الخاصية | القيمة |
|---|---|
| **Auth** | إلزامي (bearer token) |
| **RLS** | مطبّقة بدور المستخدم |
| **Cache** | TanStack Query بـ `staleTime` 60s |

### 2.2 نمط الكتابة المحمية (Authenticated Mutation)

```typescript
export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => placeOrderSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ orderId: string }> => { ... });
```

| الخاصية | القيمة |
|---|---|
| **Idempotency** | عبر `client_request_id` في الـ payload |
| **Rate limit** | يُطبّق على مستوى Edge (مستقبلاً) |
| **Logging** | كل failure يُسجَّل في `error_logs` |

---

## 3. Public HTTP Endpoints

> الموقع: `src/routes/api/public/*.ts` — مسارات لا تتطلب auth (webhooks/cron).
> **إلزامي:** تحقق signature في كل endpoint قبل أي عملية.

### 3.1 قائمة Endpoints الحالية

| Path | Method | الغرض | Auth | Rate Limit |
|---|---|---|---|---|
| `/api/public/health` | GET | فحص حياة | None | 60/min |
| _(لا يوجد بعد — placeholder)_ | | | | |

### 3.2 Template لـ Webhook جديد

```typescript
// src/routes/api/public/<provider>-webhook.ts
export const Route = createFileRoute("/api/public/<provider>-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const sig = request.headers.get("x-signature");
        const body = await request.text();
        const expected = createHmac("sha256", process.env.WEBHOOK_SECRET!)
          .update(body).digest("hex");
        if (!sig || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
          return new Response("unauthorized", { status: 401 });
        }
        // process...
        return new Response("ok");
      },
    },
  },
});
```

---

## 4. Edge Functions

> الموقع: `supabase/functions/<name>/index.ts`
> Auto-deployed.

| Function | Purpose | Auth | Input | Output |
|---|---|---|---|---|
| `hakim-chat` | محادثة مع AI Advisor | JWT | `{ messages: ChatMsg[] }` | SSE stream |
| `hakim-advisor` | توصيات استراتيجية لمدير | JWT (admin) | `{ topic: string }` | `{ advice: string, sources: [] }` |
| `hakim-pulse` | مراقبة شذوذ لحظية | Cron | `{}` | `{ alerts: Alert[] }` |
| `generate-product-image` | توليد صورة منتج | JWT (admin) | `{ prompt: string, productId: uuid }` | `{ imageUrl: string }` |

---

## 5. Pricing Engine Contract

> الموقع: `src/core/engine/pricing/`
> **العقد المركزي:** كل سعر يُعرض في النظام يأتي من `pricingEngine.calculate()`.

### 5.1 Input Contract

```typescript
interface PricingContext {
  readonly product: Product;
  readonly quantity: number;
  readonly customerTier?: CustomerTierKey; // 'guest'|'bronze'|'silver'|'gold'|'platinum'|'vip'
  readonly customerId?: string;
  readonly cartContext?: { totalSubtotal: number; itemCount: number };
  readonly adminOverride?: boolean; // يكسر Loss Prevention — يُسجَّل
  readonly adminUserId?: string;    // إلزامي لو adminOverride=true
}
```

### 5.2 Output Contract

```typescript
interface PriceBreakdown {
  readonly basePrice: number;
  readonly costPrice: number;        // من DB، خاص — لا يُعرض للعميل
  readonly subtotal: number;
  readonly discountTotal: number;
  readonly grandTotal: number;
  readonly netProfit: number;        // خاص — للوحة الإدارة
  readonly modifiers: ReadonlyArray<PricingModifier>;
  readonly rewards: { points: number; bonusPoints?: number };
  readonly flags: {
    isLossPreventionTriggered: boolean;
    discountLocked: boolean;
    requiresAdminApproval: boolean;
    excludedFromDiscounts: boolean;
    exclusionMessage?: string;
  };
}
```

### 5.3 ضوابط (Invariants — لا تُكسَر أبداً)

1. `grandTotal ≥ costPrice × MIN_PROFIT_RATIO` ما لم `adminOverride === true`.
2. `discountTotal ≤ subtotal × MAX_DISCOUNT_RATIO` (افتراضياً 30%).
3. `points ≥ 0` دائماً.
4. لو `excludedFromDiscounts` → `discountTotal === 0` ما لم admin override.

---

## 6. Live Rules Contract

> القراءة: synchronous عبر `liveRules.*` (0ms).
> الكتابة: عبر صفحات الإدارة → جداول DB → re-fetch تلقائي عند window focus.

### 6.1 `loyalty_tier_rules`

| Column | Type | الحدود | ملاحظات |
|---|---|---|---|
| `tier` | enum | bronze\|silver\|gold\|platinum\|vip | unique |
| `discount_pct` | numeric | 0 ≤ x ≤ 0.5 | يُقصّ تلقائياً عند القراءة |
| `points_multiplier` | numeric | 0 ≤ x ≤ 10 | يُقصّ تلقائياً |
| `min_lifetime_spend` | numeric | ≥ 0 | للترقية التلقائية للفئة |
| `is_active` | bool | | لو false → fallback للقيمة الافتراضية |

**Read API:**
```typescript
liveRules.getTierDiscount(tier)    // → number (0..0.5)
liveRules.getTierMultiplier(tier)  // → number (0..10)
```

### 6.2 `incentive_milestones`

| Column | Type | ملاحظات |
|---|---|---|
| `key` | text | unique stable id (e.g. "free-delivery") |
| `threshold` | numeric > 0 | حد التفعيل بالجنيه |
| `title` / `reward` | text | عربي معروض للعميل |
| `icon` | text | اسم Lucide icon |
| `sort_order` | int | ترتيب العرض |
| `is_active` | bool | |

**Read API:**
```typescript
liveRules.getMilestones() // → ReadonlyArray<IncentiveMilestoneDTO>
```

---

## 7. Database Tables — Public API

> "Public" هنا = الجداول التي تستخدمها الواجهة الأمامية مباشرة عبر Supabase client.
> كل جدول له RLS مفعّلة.

### 7.1 جداول القراءة العامة (Public Read, Restricted Write)

| Table | Read | Write | ملاحظات |
|---|---|---|---|
| `products` | الكل | admin/vendor | RLS: SELECT to anon |
| `categories` | الكل | admin | |
| `loyalty_tier_rules` | authenticated | admin | live rule |
| `incentive_milestones` | authenticated | admin | live rule |

### 7.2 جداول العميل (User-Scoped)

| Table | RLS Pattern |
|---|---|
| `cart_items` | `auth.uid() = user_id` |
| `orders` | `auth.uid() = user_id` OR `has_role('admin')` |
| `addresses` | `auth.uid() = user_id` |
| `wallet_transactions` | `auth.uid() = user_id` (read), system (write) |

### 7.3 جداول الإدارة فقط

| Table | RLS Pattern |
|---|---|
| `admin_override_logs` | `has_role('admin')` (read), authenticated INSERT |
| `commission_ledger` | `has_role('admin')` |
| `business_settings` | `has_role('admin')` |
| `user_roles` | `has_role('admin')` (write), self-read |

---

## 8. RLS Policy Patterns

### ✅ Patterns مسموح بها

```sql
-- User-scoped
CREATE POLICY "users_own_rows" ON public.x FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Role-based
CREATE POLICY "admins_all" ON public.x FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Public read
CREATE POLICY "public_read" ON public.x FOR SELECT USING (true);

-- Insert-only audit log
CREATE POLICY "audit_insert" ON public.x FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- (لا UPDATE/DELETE policies = immutable)
```

### ❌ Patterns ممنوعة

```sql
-- لا تكتب أبداً:
CREATE POLICY "x" ON public.x FOR INSERT WITH CHECK (true);  -- ❌
CREATE POLICY "x" ON public.x FOR UPDATE USING (true);       -- ❌
CREATE POLICY "x" ON public.x FOR DELETE USING (true);       -- ❌
```

---

## 9. Versioning & Deprecation

### قواعد التغيير

| نوع التغيير | يستوجب |
|---|---|
| إضافة حقل اختياري | تحديث docs، minor bump |
| إضافة endpoint جديد | تحديث docs، minor bump |
| تغيير نوع حقل موجود | **breaking** — endpoint جديد + ADR |
| حذف endpoint | فترة deprecation 30 يوم + ADR |
| تغيير سلوك خصم | ADR + إعلان عبر `business_settings` |

### Deprecation Checklist

- [ ] أنشئ ADR بحالة `Superseded by ADR-XXXX` على القرار القديم
- [ ] ضع warning في الكود: `/** @deprecated Use X instead. Removed in v2.0 */`
- [ ] حدّث `API_CONTRACTS.md` بقسم "Deprecated" منفصل
- [ ] أضف log عند كل استخدام للـ endpoint المهجور
- [ ] انتظر أسبوعاً، ثم احذف

---

## 📞 جهة الاتصال

أي تغيير على هذه الوثيقة يتطلب موافقة Principal Architect + ADR.

— Reef Almadina API Council
