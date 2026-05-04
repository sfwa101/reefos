# ADR-0001: تبنّي معمارية الخلايا الجذعية (Stem-Cell Architecture)

| Field | Value |
|---|---|
| **Status** | `Accepted` |
| **Date** | 2026-04-15 |
| **Authors** | Principal AI Co-Pilot |
| **Phase** | Phase 6 |
| **Tags** | `architecture`, `modularity` |

---

## 1. السياق

المنصة تخدم 8+ عمودياً (سوبرماركت، لحوم، صيدلية، مطاعم، مطبخ، حلويات، اشتراكات، قرية...) مع توقعات بإضافة المزيد. التصميم التقليدي (folder per feature يستورد من الكل) يؤدي لـ:
- Coupling عالٍ يجعل تعديل أي موديول مخاطرة.
- استحالة استئصال موديول دون كسر آخرين.
- صعوبة العمل المتوازي لفرق متعددة.

## 2. القرار

كل عمودي يعيش في `src/modules/<name>/` كـ **خلية مستقلة تماماً** بقواعد:
1. ❌ ممنوع `import` بين الموديولات (`modules/A` ↔ `modules/B`).
2. ✅ التبادل عبر طبقات مشتركة فقط: `context/`, `core/`, `lib/`, `features/`, `components/ui/`.
3. ✅ كل موديول يحوي `<Module>Page.tsx`, `components/`, `hooks/`, `types.ts`, `constants.ts`.
4. ✅ حذف مجلد الموديول لا يكسر الباقي (يكسر فقط الـ route الخاص به).

## 3. البدائل المرفوضة

| البديل | لماذا رُفض |
|---|---|
| Monorepo بـ packages منفصلة | overhead إضافي بدون فائدة في تطبيق واحد |
| Feature folders تقليدية | لا تمنع cross-imports، coupling يتسرّب |
| Micro-frontends | معقدة، تكلفة شبكية، غير مبررة لـ SPA واحد |

## 4. النتائج

### إيجابيات
- ✅ كل موديول قابل للتطوير/الحذف بشكل مستقل
- ✅ فرق متعددة تعمل دون تعارض
- ✅ سهولة test كل موديول معزولاً

### سلبيات
- ⚠️ بعض التكرار في كود UI بسيط (مقبول مقابل العزل)
- ⚠️ يتطلب discipline من المطور (يُفرض عبر code review)

## 5. خطة التنفيذ
- [x] إعادة هيكلة الموديولات الموجودة لهذا النمط
- [x] توثيق القاعدة في `MANIFESTO.md` § 1.1
- [x] إضافة anti-pattern في `EXECUTION_PLAYBOOK.md`

## 6. معايير القبول
- [x] لا `import` من `modules/X` إلى `modules/Y` (تحقق بـ `rg`)
- [x] حذف موديول كامل لا يكسر `tsc --noEmit`

## 7. روابط
- `docs/REEF_ALMADINA_MANIFESTO.md` § 1.1
- `src/modules/`
