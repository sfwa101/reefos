# Wave 2 — Catalog Runtime Infrastructure (خطة التنفيذ السيادية)

نطاق المهمة ضخم (12 نظامًا فرعيًا، ~40 ملفًا جديدًا، Seed لـ 24 قسم + 120 منتج + صور AI). تنفيذها دفعة واحدة في رد واحد سينتج عنه:
- ضغط معماري وأخطاء tsc متراكمة
- استحالة المراجعة البشرية
- تجاوز نوافذ الـ tool calls
- صور AI تستهلك 15-45 دقيقة من tool execution

لذلك أقترح تقسيمها إلى **4 موجات فرعية** (Wave 2.A → 2.D)، كل موجة قابلة للتسليم والاختبار مستقلة، مع التزام كامل بالقواعد الصارمة (لا hardcoded، لا UI coupling، لا queries في components).

---

## الموجات الفرعية

### Wave 2.A — Domain Core (الأساس النظيف، بدون بيانات)
**الهدف:** بناء طبقة `src/core/catalog/` و `src/core/sections/` كاملةً بـ types/interfaces نقية، صفر اعتماد على Supabase داخل الواجهات.

**الملفات (جديدة):**
```
src/core/catalog/
├── types.ts                          # ProductCardVM, ProductDetailsVM, ProductVariantVM, ProductAddonVM, ProductNutritionVM, ProductRelationVM
├── service/
│   ├── CatalogService.ts             # facade وحيد للواجهات
│   └── catalog.functions.ts          # createServerFn handlers (RLS-aware)
├── runtime/
│   ├── ProductRuntimeEngine.ts       # orchestrates fetch → transform → hydrate
│   ├── ProductTransformers.ts        # DB row → domain entity
│   ├── ProductHydrationPipeline.ts   # i18n resolve, price calc, badge derive
│   └── ProductViewModelFactory.ts    # entity → VM (Card/Details/List)
├── adapters/
│   └── SectionAdapters.ts            # per-section view shape resolver
├── resolvers/
│   ├── ProductCapabilityResolver.ts  # which capabilities apply to this product?
│   └── RecommendationResolver.ts     # hybrid: manual + similarity + frequency
└── index.ts                          # public API barrel

src/core/sections/
├── types.ts                          # SectionIdentity, SectionTone, SectionBehavior
├── SectionRegistry.ts                # runtime lookup (DB-backed, cached)
├── SectionIdentityResolver.ts        # tone/cardStyle/sortStrategy/badges
└── index.ts

src/core/capabilities/
├── CapabilityRegistry.ts             # central capability catalog
├── capabilities.functions.ts         # server fn: load active capabilities
└── index.ts                          # exported keys (constants only, NOT enums)

src/core/runtime-ui/
├── types.ts                          # RenderDescriptor, BlockKind
├── RuntimeRenderer.tsx               # consumes descriptor → renders blocks
├── blocks/                           # ProductCardBlock, GridBlock, RecommendationBlock
└── ResolveRenderTree.ts              # section + capabilities → descriptor tree
```

**اختبار التسليم:** `bun run build:dev` يعبر بدون أخطاء، الـ types مكتملة.

---

### Wave 2.B — Data Plane (Seed الأقسام والقدرات + Server Functions)
**الهدف:** ملء جداول Wave 1 ببيانات الهوية الديناميكية، ووصل CatalogService بالـ DB عبر createServerFn.

**التنفيذ:**
1. **Seed 12 capabilities** في `capability_registry`:
   `supports_nutrition, supports_variants, supports_addons, supports_wholesale, supports_cold_shipping, supports_family_mode, supports_quick_buy, supports_meal_mode, supports_subscription, supports_health_filters, supports_seasonal, supports_b2b_pricing`
2. **Seed 24 sections** في `sections` مع `attributes jsonb` (tone, cardStyle, sortStrategy, badgeStrategy, interactionPattern):
   السوبرماركت، الخضار، الفواكه، اللحوم، الدواجن، الأسماك، منتجات القرية، العطارة، الحلويات، المجمدات، المشروبات، المخبوزات، الأطفال، الحيوانات، المطاعم، السلال، الجملة، الصحي، الرياضي، الموسمي، رمضان، العيد، الهدايا، الأسرة
3. **Seed `section_capabilities`** — كل قسم يفعّل قدراته (مثلاً اللحوم تفعّل cold_shipping + nutrition + b2b_pricing)
4. **Server Functions في `catalog.functions.ts`:**
   - `listProductsBySection({ sectionSlug, limit, offset, sort })`
   - `getProductDetails({ slug })`
   - `getProductRelations({ productId, types })`
   - `searchProducts({ query, filters })`
   كلها `.middleware([requireSupabaseAuth])` للقراءة العامة (RLS يسمح).

**اختبار التسليم:** استعلام `SELECT * FROM sections` يرجع 24 صف، CatalogService.listBySection يعمل من devtools.

---

### Wave 2.C — Search + Image Pipeline + Performance
**الهدف:** إضافة الطبقات الذكية حول CatalogService.

**الملفات:**
```
src/core/search/
├── SearchRuntime.ts                  # intent parser + filter composer
├── intents/                          # SemanticIntent, NutritionIntent, MealIntent, FamilyIntent
└── search.functions.ts

src/core/media/
├── ImagePipeline.ts                  # responsive srcset, blur hash, AVIF/WebP
├── ImageTransform.ts                 # supabase storage transform URL builder
└── BlurPlaceholder.ts

src/core/catalog/hooks/
├── useProductsBySection.ts           # TanStack Query + ensureQueryData
├── useProductDetails.ts
├── useRecommendations.ts
└── queryKeys.ts                      # central query key factory
```

**TanStack Query integration:**
- `queryOptions` factories في `queryKeys.ts`
- استخدام `ensureQueryData` في loaders + `useSuspenseQuery` في components
- `defaultPreloadStaleTime: 0` (موجود مسبقًا)
- Pagination عبر search params + `loaderDeps`

**اختبار التسليم:** صفحة متجر اختبارية تعرض منتجات قسم باستخدام VM فقط، صفر `supabase.from(...)` في component.

---

### Wave 2.D — Product Generator + AI Images
**الهدف:** توليد 120 منتج واقعي + 120 صورة احترافية.

**التنفيذ:**
- `scripts/seed-products-wave2.mjs` يقرأ الأقسام والقدرات من DB
- يستدعي `google/gemini-2.5-pro` مرة لكل قسم → 5 منتجات JSON منظمة (name_i18n, description_i18n, price, variants based on capabilities, addons, nutrition if supports_nutrition)
- يستدعي `google/gemini-3-pro-image-preview` لكل منتج → يرفع لـ `product-media` bucket
- يولد `product_relations` post-hoc بناءً على tags المشتركة + بنية القسم (مثلاً البيض↔الجبن↔الخبز)

**ملاحظة هامة:** هذه الموجة قد تستغرق 30-45 دقيقة من تنفيذ السكربت (محدود بـ rate limits لـ AI gateway). سأشغّلها كـ background job مع progress logs.

**اختبار التسليم:** 120 منتج في `usa_products`، 120 صورة في `product_media`، علاقات منطقية في `product_relations`.

---

## أسئلة قبل البدء

1. **هل تريد التسليم بالموجات (2.A الآن، ثم 2.B، ثم 2.C، ثم 2.D)** كل موجة في رد منفصل بعد موافقتك؟ هذا الأسلوم الأسلم.
   - البديل: تنفيذ 2.A + 2.B دفعة واحدة (الأساس + البيانات) ثم انتظار، ثم 2.C + 2.D.

2. **في Wave 2.B**، هل تفضّل:
   - **(أ)** أن أرفع `attributes` الهوية البصرية للأقسام كـ JSON tokens (tone, cardStyle, badge keys) — مرنة لكن تحتاج resolvers
   - **(ب)** أم أن أربطها بـ `capability_registry` مباشرةً (capabilities هي مصدر الحقيقة الوحيد)؟

3. **في Wave 2.D**، هل المنتج يحمل:
   - **(أ)** صورة hero واحدة فقط (120 صورة، أسرع)
   - **(ب)** أم gallery 3 صور (360 صورة، ×3 وقت/تكلفة، أكثر واقعية)؟

أنتظر أمرك للبدء بـ **Wave 2.A**.