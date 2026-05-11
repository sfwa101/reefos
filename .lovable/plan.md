# Wave 2 — Runtime Product Infrastructure (خطة تنفيذ مرحلية)

## السياق الحالي
- لدينا بالفعل: `SectionIdentityRegistry`, `SmartProductCard`, `useSectionSubcategories`, seed pipeline (`scripts/seeds/run-seed.ts`)، وقسم اللحوم مكتمل (15 منتج).
- الواجهات لا تزال تستدعي Supabase مباشرة في عدة أماكن (orchestrator, hooks).
- لا يوجد طبقة ViewModel موحدة، ولا CapabilityRegistry حقيقي، ولا RuntimeRenderingEngine منفصل.

## المبدأ المعماري
```text
DB (Supabase)
   │
   ▼
CatalogService (الوحيد المسموح له بالـ queries)
   │
   ▼
ProductHydrationPipeline → ProductTransformers → CapabilityResolver
   │
   ▼
ViewModelFactory  ──►  ProductCardVM / DetailsVM / ListVM
   │
   ▼
RuntimeRenderingEngine (يقرر Card/Layout/Blocks حسب capabilities)
   │
   ▼
UI Components (نظيفة، تستهلك VM فقط)
```

## التنفيذ على 6 موجات (Waves)

### Wave 2.1 — Catalog Runtime Core (الأساس)
**ملفات جديدة تحت `src/core/catalog/`:**
- `types/ProductDomain.ts` — domain types مستقلة عن DB
- `viewmodels/ProductCardVM.ts`, `ProductDetailsVM.ts`, `ProductListVM.ts`, `ProductVariantVM.ts`, `ProductAddonVM.ts`, `ProductNutritionVM.ts`, `ProductRelationVM.ts`
- `services/CatalogService.ts` — الواجهة الوحيدة للـ DB (list, get, search, related)
- `pipeline/ProductHydrationPipeline.ts` — DB row → Domain
- `pipeline/ProductTransformers.ts` — Domain → VM
- `pipeline/ProductViewModelFactory.ts` — composition root
- `adapters/SectionAdapters.ts` — per-section overrides (badges, sort, filter)

### Wave 2.2 — Capability Registry
**ملفات جديدة تحت `src/core/capabilities/`:**
- `CapabilityRegistry.ts` — enum + metadata (`supports_nutrition`, `supports_variants`, `supports_addons`, `supports_wholesale`, `supports_cold_shipping`, `supports_family_mode`, `supports_quick_buy`, `supports_meal_mode`, `supports_subscription`, `supports_health_filters`)
- `CapabilityResolver.ts` — يحل قدرات قسم/منتج وقت التشغيل
- `SectionCapabilityMap.ts` — ربط slug → capabilities (config، ليس hardcoded في UI)
- توسيع `SectionIdentityRegistry` بحقل `capabilities: Capability[]`

### Wave 2.3 — Runtime Rendering Engine
**ملفات جديدة تحت `src/core/runtime-ui/`:**
- `engine/RenderingEngine.ts` — يقرر أي Card/Layout/Blocks يُعرض
- `engine/CardResolver.ts` — يختار variant من `SmartProductCard` حسب capabilities
- `engine/LayoutResolver.ts` — يختار layout من `LayoutFactory`
- `engine/BlockResolver.ts` — يقرر أي blocks (nutrition, variants, addons, recommendations) تظهر
- `blocks/` — مكونات صغيرة قابلة للتركيب (NutritionBlock, VariantPicker, AddonStrip, RelationsStrip)

### Wave 2.4 — Refactor الواجهات على الـ Runtime
- `ProductsGrid` و `useHomeOrchestrator` و `SduiCategoryPage` يستهلكون `CatalogService` + `RenderingEngine` فقط (لا Supabase queries).
- إزالة أي mapping صلب من الـ hooks وحقنه في `SectionAdapters`.
- TanStack Query: مفاتيح موحدة `['catalog', section, filters]` مع cache مشترك.

### Wave 2.5 — Section Seeds + Capabilities (24 قسم)
- ملف `scripts/seeds/sections/<slug>.seed.json` لكل قسم بقدراته الخاصة.
- توليد 5 منتجات مبدئية لكل قسم (متوسط 120 منتج إجمالاً)، بالأنماط نفسها التي طبقناها على اللحوم.
- صور: Pro للحلويات/السلال/المطاعم، Flash للباقي.
- Relations engine: manual + tag similarity + section co-occurrence.

### Wave 2.6 — Search + Image Pipeline
- `src/core/search/SearchRuntime.ts` — semantic-friendly (tags + intent + capabilities)، fallback إلى ILIKE.
- `src/core/media/ImagePipeline.ts` — responsive `srcSet`, blur placeholder من `tiny_thumb`, WebP first.

## ما الذي يُسلَّم في هذه الجولة (الموجة الفعلية)
لتجنب PR ضخم غير قابل للمراجعة، أقترح **تنفيذ 2.1 + 2.2 + 2.3 + 2.4 الآن** (الأساس المعماري الكامل بدون توسيع المحتوى)، مع الإبقاء على قسم اللحوم كقسم حي للاختبار، ثم 2.5 و 2.6 في موجات لاحقة.

## نقطة قرار
هل أبدأ بـ **2.1 → 2.4 دفعة واحدة** (تغيير معماري كبير، يتطلب اختبار كل الأقسام بعدها)، أم تفضّل **2.1 + 2.2 فقط الآن** (آمن، بدون لمس الواجهات)، ثم 2.3 + 2.4 في رسالة تالية؟