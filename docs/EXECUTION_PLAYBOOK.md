# 🛠️ دليل التنفيذ — Reef Almadina Execution Playbook

> دليل عملي يومي للمطور (بشري أو AI) لتنفيذ أي تغيير على المنصة دون كسر "الدستور المعماري".
> اقرأ هذا قبل كل feature، وراجعه عند كل code review.

---

## 📋 الفهرس

1. [دورة حياة الـ Feature (End-to-End)](#1-دورة-حياة-الـ-feature)
2. [Workflows جاهزة لكل نوع تغيير](#2-workflows-جاهزة)
3. [قائمة فحص قبل الـ Commit (Pre-Commit Checklist)](#3-pre-commit-checklist)
4. [أنماط شائعة (Cookbook)](#4-cookbook--أنماط-شائعة)
5. [أخطاء يجب تجنبها (Anti-Patterns)](#5-anti-patterns)

---

## 1. دورة حياة الـ Feature

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ DISCOVER │→ │  DESIGN  │→ │   BUILD  │→ │  VERIFY  │→ │   SHIP   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
   اقرأ        اكتب ADR       نفّذ          اختبر         وثّق
   الموجود     قبل الكود     بـ TDD        وافحص          وحدّث
```

### 1.1 DISCOVER (5 دقائق — لا تتخطّاها أبداً)
- [ ] اقرأ `docs/REEF_ALMADINA_MANIFESTO.md` — أي مبدأ يخصّ تغييرك؟
- [ ] ابحث: هل الوظيفة موجودة بالفعل؟ `rg "<keyword>" src/`
- [ ] حدّد الموديول/الطبقة الصحيحة (`modules/`, `features/`, `core/`, `lib/`).
- [ ] اقرأ `docs/API_CONTRACTS.md` إذا كان التغيير يلمس عقد public.

### 1.2 DESIGN (10-30 دقيقة)
- [ ] لو القرار معماري (يؤثر على >2 ملفات أو يضيف dependency جديدة) → أنشئ ADR من `docs/adr/TEMPLATE.md`.
- [ ] ارسم data flow على ورقة (أو ASCII):
  ```
  User → Component → Hook → Context/Engine → Supabase → RLS → Response
  ```
- [ ] حدّد طبقة الحماية: RLS؟ RoleGuard؟ SubdomainGuard؟ Validation Trigger؟

### 1.3 BUILD (الجزء الأطول)
اتبع الـ workflow المناسب من القسم 2 أدناه.

### 1.4 VERIFY (إلزامي قبل القول "تم")
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] لا `any` جديد (`rg ":\s*any\b" src/` للتأكد).
- [ ] افتح الواجهة على viewport 375px وتأكد من سلامة UX.
- [ ] لو لمست DB → شغّل `supabase--linter` وعالج أي تحذير جديد.
- [ ] اختبر سيناريو الفشل: ماذا لو فشل DB؟ هل يوجد Fallback؟

### 1.5 SHIP
- [ ] حدّث `docs/REEF_ALMADINA_MANIFESTO.md` لو الـ feature غيّر بنية معمارية.
- [ ] حدّث `docs/API_CONTRACTS.md` لو أضفت/عدّلت endpoint أو RPC.
- [ ] أضف ADR في `docs/adr/` لو القرار يستحق التسجيل.

---

## 2. Workflows جاهزة

### 🟢 W1 — إضافة منتج/حقل جديد للمتجر (UI فقط)
1. حدّد الموديول: `src/modules/<vertical>/`.
2. عدّل `types.ts` أولاً (العقد).
3. عدّل `hooks/use<Module>Logic.ts` (المنطق).
4. عدّل `components/` (العرض).
5. **ممنوع** لمس `core/` أو موديول آخر.

### 🔵 W2 — إضافة قاعدة تسعير جديدة (Pricing Rule)
1. هل هي خاصة بعمودي محدد؟ → `src/core/engine/pricing/strategies/<Vertical>PricingStrategy.ts`.
2. هل هي أفقية (تطبق على أي منتج)؟ → `src/core/engine/pricing/discounts/` أو `rewards/`.
3. هل هي حماية ربحية؟ → `src/core/engine/pricing/guardrails/`.
4. سجّلها في `bootstrap.ts`.
5. اختبر: أضف منتج، احسب يدوياً، تأكد أن `breakdown.modifiers` يحتوي قاعدتك.
6. **ممنوع** كتابة `* 0.95` في أي مكون UI.

### 🟡 W3 — إضافة جدول DB جديد
1. استدعِ `supabase--migration` (لا تعدّل types.ts يدوياً).
2. أنشئ الجدول + `ENABLE ROW LEVEL SECURITY` فوراً.
3. أنشئ RLS policies منفصلة لكل operation (SELECT/INSERT/UPDATE/DELETE).
4. لا تستخدم `USING (true)` لـ INSERT/UPDATE/DELETE — استخدم `has_role()` أو `auth.uid() = user_id`.
5. لو احتجت validation زمني (e.g. `expire_at > now()`) → استخدم **trigger** وليس CHECK.
6. شغّل `supabase--linter` بعد المايجريشن.

### 🔴 W4 — إضافة قاعدة قابلة للتعديل من الإدارة (Live Rule)
1. أنشئ جدول DB (W3).
2. أضف Fallback constants في `src/core/engine/pricing/config/liveRulesCache.ts`.
3. أضف `hydrate*()` function في الكاش.
4. عدّل `useLiveRules.ts` لجلب الجدول الجديد.
5. أنشئ صفحة إدارة في `src/pages/admin/` لتعديل القيم.
6. أضف route `src/routes/admin.<feature>.tsx` محمي بـ `RoleGuard`.

### 🟣 W5 — إضافة Endpoint عام (Webhook / API)
1. أنشئ `src/routes/api/public/<name>.ts`.
2. **إلزامي:** تحقّق من signature/secret قبل أي عملية.
3. استخدم `supabaseAdmin` فقط بعد التحقق.
4. وثّق العقد في `docs/API_CONTRACTS.md`.

### ⚫ W6 — إضافة دور جديد (Role)
1. عدّل enum `app_role` عبر migration.
2. **ممنوع** تخزين الدور في `profiles` — يبقى في `user_roles`.
3. حدّث `has_role()` لو تحتاج (الغالب لا).
4. أضف RLS policies تستخدم `has_role(auth.uid(), '<new_role>')`.
5. أنشئ `RoleGuard` UI متخصص لو احتاجت الواجهة.

---

## 3. Pre-Commit Checklist

نسخ والصق على كل PR:

```markdown
### Manifesto Compliance
- [ ] لا cross-module imports (`modules/A` → `modules/B`)
- [ ] لا حسابات مالية يدوية في UI (كل شيء عبر `pricingEngine`)
- [ ] لا `any` جديد في الكود
- [ ] `tsc --noEmit` يمر بدون أخطاء
- [ ] Mobile-first: تم الاختبار على 375px

### Security
- [ ] أي جدول جديد عليه RLS
- [ ] لا `USING (true)` لـ INSERT/UPDATE/DELETE
- [ ] الأدوار في `user_roles` فقط
- [ ] `supabase--linter` لم يضف تحذيرات جديدة

### Resilience
- [ ] فشل DB → fallback آمن
- [ ] فشل Network → optimistic update + rollback
- [ ] حالة فارغة (Empty State) موثّقة بصرياً

### Documentation
- [ ] ADR مُنشأ لو القرار معماري
- [ ] `API_CONTRACTS.md` محدّث لو الـ public surface تغيّر
- [ ] `MANIFESTO.md` محدّث لو البنية تغيّرت
```

---

## 4. Cookbook — أنماط شائعة

### 🍳 4.1 Optimistic Update مع Rollback
```typescript
const mutation = useMutation({
  mutationFn: updateThing,
  onMutate: async (next) => {
    await qc.cancelQueries({ queryKey });
    const prev = qc.getQueryData(queryKey);
    qc.setQueryData(queryKey, next);
    return { prev };
  },
  onError: (_e, _v, ctx) => qc.setQueryData(queryKey, ctx?.prev),
  onSettled: () => qc.invalidateQueries({ queryKey }),
});
```

### 🍳 4.2 Type-Safe Metadata Reader (بدون `any`)
```typescript
function readBoolFlag(
  meta: Readonly<Record<string, unknown>> | undefined,
  key: string,
): boolean {
  if (!meta) return false;
  return meta[key] === true;
}
```

### 🍳 4.3 RLS Policy آمنة (Insert)
```sql
CREATE POLICY "users insert own rows"
ON public.things FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);  -- ❌ never USING (true)
```

### 🍳 4.4 Synchronous Live Rule Read
```typescript
// في pricing rule (يجب أن تكون sync):
const pct = liveRules.getTierDiscount(tier); // 0ms — كاش متزامن
if (pct <= 0) return [];
```

### 🍳 4.5 Subdomain-Aware Redirect
```typescript
const adminHost = window.location.hostname.startsWith("admin.");
if (!adminHost && location.pathname.startsWith("/admin")) {
  navigate({ to: "/", replace: true });
}
```

---

## 5. Anti-Patterns

| ❌ خطأ شائع | ✅ الصواب |
|---|---|
| `import { ... } from "@/modules/meat"` داخل `modules/sweets` | استخدم طبقة مشتركة في `lib/` أو `core/` |
| `total = price * 0.95` في component | `pricingEngine.calculate(ctx).grandTotal` |
| `const role = user?.role` | `const { data } = useUserRole()` (يقرأ من `user_roles`) |
| `localStorage.getItem("isAdmin")` | RLS + `has_role()` على السيرفر |
| `metadata: any` | `metadata: Readonly<Record<string, unknown>>` + type guards |
| `await new Promise(r => setTimeout(r, 500))` لتأخير UI | حالات تحميل حقيقية أو skeleton |
| تعديل `src/integrations/supabase/types.ts` | استخدم migration tool — يُحدَّث تلقائياً |
| تعديل `src/routeTree.gen.ts` | أنشئ ملف route، الـ plugin يولّده |
| `CHECK (expire_at > now())` في DB | استبدله بـ trigger BEFORE INSERT/UPDATE |
| RLS: `USING (true)` لـ UPDATE | `USING (auth.uid() = user_id)` أو `has_role(...)` |

---

## 🎓 ختام

> **القاعدة الذهبية:** قبل كتابة أي سطر، اسأل نفسك: "هل سيمر هذا الـ checklist في القسم 3؟"
> إن كان الجواب لا، **توقف** وأعد التصميم.

— Reef Almadina Engineering
