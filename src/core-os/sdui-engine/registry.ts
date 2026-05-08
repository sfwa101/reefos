/**
 * SDUI Component Registry — single source of truth for editable customer
 * sections. The admin editor and the runtime render engine both consume
 * this registry. Adding a new editable section means:
 *   1. Build the React component.
 *   2. Register a renderer in `LayoutFactory`'s REGISTRY.
 *   3. Add a metadata entry here so the admin editor can list/edit it.
 *
 * No arbitrary HTML, no string-eval — only props the registry approves.
 */
import type { SectionKey, SectionConfig } from "./types";

export type PageKey =
  | "main_hub"
  | "home"
  | "sections"
  | "offers"
  // Phase 29 — Sovereign Unification page keys
  | "offers_hub"
  | "maeen_hub"
  | "category_storefront"
  // Phase 30 — Advanced Stem Cell Ascendancy (complex domain pages)
  | "reef_restaurants"
  | "reef_subscriptions"
  | "reef_baskets"
  | "reef_wholesale"
  | "reef_compare_home_goods"
  | "reef_school_library";

export type AllowedOverride =
  | "padding"
  | "tone"
  | "density"
  | "title"
  | "showTimer"
  | "sticky"
  | "variant";

export type SectionMeta = {
  key: SectionKey;
  /** Arabic display label shown in the editor */
  label: string;
  /** One-line description for the editor */
  description: string;
  /** Which pages this section may appear on */
  pages: PageKey[];
  /** Default title — admin can override */
  defaultTitle?: string;
  /** Which style/behaviour overrides the editor exposes */
  allowedOverrides: AllowedOverride[];
  /** Lucide icon name (optional, for editor list) */
  iconKey?: string;
};

export const PAGE_LABELS: Record<PageKey, string> = {
  main_hub: "الواجهة الرئيسية (Hero)",
  home: "الصفحة الرئيسية (الكاملة)",
  sections: "صفحة الأقسام",
  offers: "صفحة العروض",
  offers_hub: "صفحة العروض (Sovereign)",
  maeen_hub: "بوابة معين (Sovereign)",
  category_storefront: "متاجر الأقسام (Sovereign)",
  reef_restaurants: "مجمع المطاعم",
  reef_subscriptions: "خطط الاشتراكات",
  reef_baskets: "السلال الذكية",
  reef_wholesale: "متجر الجملة",
  reef_compare_home_goods: "مقارنة الأجهزة",
  reef_school_library: "بوابة الطالب",
};

/** Default section order used when seeding a new page. */
export const DEFAULT_PAGE_ORDER: Record<PageKey, SectionKey[]> = {
  main_hub: ["MainSearchHeader", "StoryCircles", "PromotionSlider", "DepartmentGrid"],
  home: [
    "HeroBanner",
    "SearchAndFilters",
    "CategoriesGrid",
    "BundlesRail",
    "BestSellersRail",
    "ProductsGrid",
  ],
  sections: ["CategoriesGrid", "ProductsGrid"],
  offers: ["BundlesRail", "BestSellersRail", "ProductsGrid"],
  offers_hub: ["SpatioTemporalOffersRail"],
  maeen_hub: ["MaeenLauncherGrid"],
  category_storefront: [
    "SearchAndFilters",
    "CategoriesGrid",
    "BundlesRail",
    "BestSellersRail",
    "ProductsGrid",
  ],
  reef_restaurants: ["SduiMenuList"],
  reef_subscriptions: ["SduiWizardChain"],
  reef_baskets: ["SduiWizardChain"],
  reef_wholesale: ["SduiComparisonGrid"],
  reef_compare_home_goods: ["SduiComparisonGrid"],
  reef_school_library: ["SduiWizardChain"],
};

export const SECTION_REGISTRY: Record<SectionKey, SectionMeta> = {
  // ---------- Main Hub stem cells ----------
  MainSearchHeader: {
    key: "MainSearchHeader",
    label: "ترويسة البحث الرئيسية",
    description: "شريط البحث وعنوان الترحيب أعلى الواجهة",
    pages: ["main_hub"],
    allowedOverrides: ["padding", "sticky"],
    iconKey: "Search",
  },
  StoryCircles: {
    key: "StoryCircles",
    label: "دوائر القصص",
    description: "دوائر تبرز المتاجر والعروض الجديدة",
    pages: ["main_hub"],
    allowedOverrides: ["padding"],
    iconKey: "Circle",
  },
  PromotionSlider: {
    key: "PromotionSlider",
    label: "شريط العروض",
    description: "بانر إعلاني متحرك أعلى الصفحة",
    pages: ["main_hub", "offers"],
    allowedOverrides: ["padding", "tone"],
    iconKey: "Image",
  },
  DepartmentGrid: {
    key: "DepartmentGrid",
    label: "شبكة الأقسام",
    description: "بطاقات الأقسام (سوبر ماركت، صيدلية، …)",
    pages: ["main_hub", "home"],
    allowedOverrides: ["padding", "density"],
    iconKey: "Grid3x3",
  },

  // ---------- Storefront sections ----------
  HeroBanner: {
    key: "HeroBanner",
    label: "البانر الرئيسي",
    description: "بطاقة العرض الترحيبية الكبيرة",
    pages: ["home"],
    allowedOverrides: ["padding", "tone", "title"],
    iconKey: "Crown",
  },
  SearchAndFilters: {
    key: "SearchAndFilters",
    label: "البحث والفلاتر",
    description: "شريط البحث + الفرز + الفلاتر",
    pages: ["home", "sections"],
    allowedOverrides: ["padding", "sticky"],
    iconKey: "Filter",
  },
  CategoriesGrid: {
    key: "CategoriesGrid",
    label: "شبكة الفئات",
    description: "تبويبات/فئات قابلة للنقر",
    pages: ["home", "sections"],
    allowedOverrides: ["padding", "density", "title"],
    iconKey: "Grid2x2",
  },
  BundlesRail: {
    key: "BundlesRail",
    label: "الحزم والعروض",
    description: "شريط أفقي للحزم والباقات",
    pages: ["home", "offers"],
    allowedOverrides: ["padding", "tone", "title"],
    iconKey: "Package",
  },
  BestSellersRail: {
    key: "BestSellersRail",
    label: "الأكثر مبيعاً",
    description: "شريط المنتجات الأكثر مبيعاً",
    pages: ["home", "offers"],
    allowedOverrides: ["padding", "tone", "title"],
    iconKey: "Flame",
  },
  ProductsGrid: {
    key: "ProductsGrid",
    label: "شبكة المنتجات",
    description: "شبكة المنتجات الرئيسية المتجاوبة",
    pages: ["home", "sections", "offers"],
    allowedOverrides: ["padding", "density", "title"],
    iconKey: "LayoutGrid",
  },
  FlashDeals: {
    key: "FlashDeals",
    label: "العروض السريعة",
    description: "عداد + عروض محدودة بزمن",
    pages: ["home", "offers"],
    allowedOverrides: ["padding", "tone", "showTimer", "title"],
    iconKey: "Zap",
  },

  // ---------- Phase 22 — Minimalist Re-Genesis ----------
  SmartGreeting: {
    key: "SmartGreeting",
    label: "ترحيب ذكي",
    description: "تحية مخصصة بحسب وقت اليوم واسم العميل",
    pages: ["main_hub", "home"],
    allowedOverrides: ["padding"],
    iconKey: "Sun",
  },
  AmanahTierProgress: {
    key: "AmanahTierProgress",
    label: "شريط المستوى (الأمانة)",
    description: "شريط تقدم مستوى الولاء — Pastel Minimalist",
    pages: ["main_hub", "home"],
    allowedOverrides: ["padding"],
    iconKey: "BadgeCheck",
  },
  PersonalizedDealsRail: {
    key: "PersonalizedDealsRail",
    label: "عروض صُممت لك",
    description: "شريط عروض شخصية مبني على سياق الهوية",
    pages: ["home", "offers"],
    allowedOverrides: ["padding", "title"],
    iconKey: "Sparkles",
  },
  BuyAgainRail: {
    key: "BuyAgainRail",
    label: "اشتر مجدداً",
    description: "إعادة طلب المنتجات السابقة بضغطة",
    pages: ["home"],
    allowedOverrides: ["padding", "title"],
    iconKey: "RotateCcw",
  },
  QuickMealsRail: {
    key: "QuickMealsRail",
    label: "وجبات سريعة",
    description: "شريط الوجبات الجاهزة من المطبخ",
    pages: ["home"],
    allowedOverrides: ["padding", "title"],
    iconKey: "Soup",
  },

  // ---------- Phase 26 — Sovereign Minimalism ----------
  OfferNeighborhoodPool: {
    key: "OfferNeighborhoodPool",
    label: "نبض الحي",
    description: "بطاقة عروض الجيرة (Group-Buy / Pulse)",
    pages: ["home", "main_hub", "offers"],
    allowedOverrides: ["padding", "title"],
    iconKey: "Users",
  },
  PredictiveRefillRail: {
    key: "PredictiveRefillRail",
    label: "حان وقت التزود",
    description: "تنبؤ بالمنتجات الاستهلاكية المرشحة لإعادة الطلب",
    pages: ["home", "main_hub"],
    allowedOverrides: ["padding", "title"],
    iconKey: "Repeat",
  },

  // ---------- Phase 29 — Sovereign Unification ----------
  SpatioTemporalOffersRail: {
    key: "SpatioTemporalOffersRail",
    label: "مصفوفة العروض الزمكانية",
    description: "محرك العروض الكامل (مكان × زمان × هوية)",
    pages: ["offers_hub"],
    allowedOverrides: ["padding"],
    iconKey: "Sparkles",
  },
  MaeenLauncherGrid: {
    key: "MaeenLauncherGrid",
    label: "شبكة بوابة معين",
    description: "شبكة التطبيقات داخل بوابة معين الموحّدة",
    pages: ["maeen_hub"],
    allowedOverrides: ["padding"],
    iconKey: "LayoutGrid",
  },

  // ---------- Phase 30 — Advanced Stem Cell Ascendancy ----------
  SduiMenuList: {
    key: "SduiMenuList",
    label: "قائمة الطعام التفاعلية",
    description: "قائمة وجبات بفئات لزجة وتكامل سلة (Restaurants)",
    pages: ["reef_restaurants"],
    allowedOverrides: ["padding", "title"],
    iconKey: "UtensilsCrossed",
  },
  SduiWizardChain: {
    key: "SduiWizardChain",
    label: "سلسلة المعالج (Wizard)",
    description: "تدفق متعدد الخطوات للاشتراكات والسلال وبوابة الطالب",
    pages: ["reef_subscriptions", "reef_baskets", "reef_school_library"],
    allowedOverrides: ["padding", "title"],
    iconKey: "Workflow",
  },
  SduiComparisonGrid: {
    key: "SduiComparisonGrid",
    label: "شبكة المقارنة",
    description: "جداول المقارنة بين المنتجات (Wholesale / HomeGoods)",
    pages: ["reef_wholesale", "reef_compare_home_goods"],
    allowedOverrides: ["padding", "title"],
    iconKey: "Scale",
  },
};

/** Ordered list of sections registered for a given page. */
export function sectionsForPage(page: PageKey): SectionMeta[] {
  return Object.values(SECTION_REGISTRY).filter((m) => m.pages.includes(page));
}

/** Whitelist a config object to only include keys allowed by the registry. */
export function sanitizeSectionConfig(
  key: SectionKey,
  cfg: Record<string, unknown>,
): Record<string, unknown> {
  const meta = SECTION_REGISTRY[key];
  if (!meta) return {};
  const allowed = new Set<string>(["enabled", ...meta.allowedOverrides]);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (allowed.has(k)) out[k] = v;
  }
  return out;
}

export const PADDING_CLASS: Record<NonNullable<SectionConfig["padding"]>, string> = {
  sm: "py-2",
  md: "py-4",
  lg: "py-8",
};

export const TONE_CLASS: Record<NonNullable<SectionConfig["tone"]>, string> = {
  primary: "bg-primary/5",
  accent:  "bg-[hsl(var(--accent))]/5",
  info:    "bg-info/5",
  success: "bg-success/5",
  warning: "bg-warning/5",
  teal:    "bg-[hsl(var(--teal))]/5",
};
