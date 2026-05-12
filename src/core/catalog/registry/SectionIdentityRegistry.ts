/**
 * SectionIdentityRegistry
 * -----------------------
 * The single source of truth for each section's UNIQUE personality:
 * hero copy, gradient overrides, search placeholder, quick actions,
 * and layout variant.
 *
 * Shared shells (SduiCategoryPage / LayoutFactory / ProductsGrid) read
 * from this registry — they MUST NOT contain section-slug switches.
 *
 * Doctrine: Capability over Identity, but Identity over Generic.
 * Sections are different products; their personality lives here.
 */

import type { StoreThemeKey } from "@/lib/storeThemes";

export interface SectionHeroConfig {
  /** Arabic eyebrow shown above the headline */
  eyebrow: string;
  /** Main hero headline */
  headline: string;
  /** Supporting body line */
  body: string;
  /** Optional gradient override; falls back to storeThemes[themeKey].gradient */
  gradient?: string;
}

export type SectionQuickActionKind = "toast" | "navigate" | "sheet";

export interface SectionQuickAction {
  /** lucide-react icon name (resolved at render time) */
  icon: string;
  label: string;
  action: SectionQuickActionKind;
  /** toast message, route path, or sheet id depending on `action` */
  payload: string;
}

export type SectionLayoutVariant =
  | "standard"
  | "meal-menu"
  | "subscription-builder"
  | "restaurant-list"
  | "basket-builder";

/**
 * Section capabilities — Wave P-C · Phase C-3.
 *
 * Drives per-vertical block gating in `resolveSectionTree` without slug
 * switches. Strings live in this module to keep the registry self-
 * contained; the resolver matches on string equality.
 */
export const SECTION_CAP = {
  COMPARE: "commerce.compare",
} as const;
export type SectionCapability = (typeof SECTION_CAP)[keyof typeof SECTION_CAP];

export interface SectionIdentity {
  slug: string;
  themeKey: StoreThemeKey;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  hero: SectionHeroConfig;
  /** Up to 3 quick action chips rendered below the hero */
  quickActions?: SectionQuickAction[];
  /** Drives how ProductsGrid / LayoutFactory render this section */
  layoutVariant: SectionLayoutVariant;
  /** Optional capability flags (Wave P-C · C-3). */
  capabilities?: ReadonlyArray<SectionCapability>;
}

export const SECTION_IDENTITY_REGISTRY: Record<string, SectionIdentity> = {
  "home-goods": {
    slug: "home-goods",
    themeKey: "homeTools",
    title: "الأدوات المنزلية",
    subtitle: "كل ما يحتاجه بيتك",
    searchPlaceholder: "ابحث عن جهاز، آداة، علامة تجارية…",
    hero: {
      eyebrow: "اختيار محرري",
      headline: "الأجهزة الأكثر مبيعاً",
      body: "توصيل مجاني للطلبات فوق 500 ج.م",
    },
    layoutVariant: "standard",
    capabilities: [SECTION_CAP.COMPARE],
  },
  produce: {
    slug: "produce",
    themeKey: "produce",
    title: "الخضار والفواكه",
    subtitle: "حصاد اليوم من المزارع",
    searchPlaceholder: "ابحث في الخضار والفواكه…",
    hero: {
      eyebrow: "حصاد اليوم",
      headline: "طازج خلال 4 ساعات",
      body: "من المزرعة إلى بابك مباشرة",
    },
    layoutVariant: "standard",
    capabilities: [SECTION_CAP.COMPARE],
  },
  dairy: {
    slug: "dairy",
    themeKey: "dairy",
    title: "منتجات الألبان",
    subtitle: "من المزرعة مباشرة إلى مائدتك",
    searchPlaceholder: "ابحث في الألبان…",
    hero: {
      eyebrow: "طازج اليوم",
      headline: "حليب صباحي",
      body: "يصلك خلال ساعتين من الحلب",
    },
    layoutVariant: "standard",
    capabilities: [SECTION_CAP.COMPARE],
  },
  meat: {
    slug: "meat",
    themeKey: "meat",
    title: "اللحوم والمجمدات",
    subtitle: "لحوم طازجة يومياً",
    searchPlaceholder: "ابحث عن لحم، دواجن، أسماك…",
    hero: {
      eyebrow: "ذبح يومي",
      headline: "لحوم طازجة بضمان الجودة",
      body: "تقطيع حسب الطلب — دواجن بلدية وبحريات طازجة",
      gradient:
        "linear-gradient(135deg, hsl(5 60% 28%), hsl(0 50% 40%) 60%, hsl(15 70% 55%))",
    },
    layoutVariant: "standard",
  },
  sweets: {
    slug: "sweets",
    themeKey: "sweets",
    title: "الحلويات والتورتة",
    subtitle: "لكل مناسبة لمسة حلوة",
    searchPlaceholder: "ابحث في الحلويات…",
    hero: {
      eyebrow: "حسب الطلب",
      headline: "تورتات بمناسبتك",
      body: "جاهزة في 24 ساعة — حجز مسبق متاح",
    },
    layoutVariant: "standard",
  },
  pharmacy: {
    slug: "pharmacy",
    themeKey: "pharmacy",
    title: "صيدلية ريف",
    subtitle: "صحتك أولوية، توصيل خلال ساعة",
    searchPlaceholder: "ابحث عن دواء، فيتامين…",
    hero: {
      eyebrow: "خدمة جديدة",
      headline: "ارفع وصفتك الطبية ويتم تجهيزها فورًا",
      body: "استشارة مجانية مع كل طلب",
    },
    quickActions: [
      { icon: "FileText", label: "رفع وصفة", action: "toast", payload: "تم فتح رفع الوصفة" },
      { icon: "Phone", label: "استشارة", action: "toast", payload: "جاري الاتصال بالصيدلاني" },
      { icon: "Clock", label: "تذكير دواء", action: "toast", payload: "تم ضبط التذكير" },
    ],
    layoutVariant: "standard",
  },
  kitchen: {
    slug: "kitchen",
    themeKey: "kitchen",
    title: "مطبخ ريف المدينة",
    subtitle: "وجبات طازجة كل يوم",
    searchPlaceholder: "ابحث عن وجبة…",
    hero: {
      eyebrow: "مطبخ السحاب الذكي",
      headline: "احجز وجبتك مسبقاً واستلمها طازجة",
      body: "توصيل 30 دقيقة · طبخ يومي",
      gradient:
        "linear-gradient(135deg, hsl(20 60% 28%), hsl(15 50% 40%) 60%, hsl(35 70% 60%))",
    },
    layoutVariant: "meal-menu",
  },
  restaurants: {
    slug: "restaurants",
    themeKey: "restaurants",
    title: "مجمع المطاعم",
    subtitle: "ألذ الوجبات من أفضل مطاعم المدينة",
    searchPlaceholder: "ابحث عن مطعم أو نوع مطبخ…",
    hero: {
      eyebrow: "مجمع ذكي · توصيل موحّد",
      headline: "طعمك المفضّل",
      body: "اطلب من أكثر من مطعم في نفس السلة",
    },
    layoutVariant: "restaurant-list",
  },
  wholesale: {
    slug: "wholesale",
    themeKey: "wholesale",
    title: "ريف الجملة",
    subtitle: "عبوات كبيرة بأسعار العضويّة",
    searchPlaceholder: "ابحث في عبوات الوفر…",
    hero: {
      eyebrow: "عضويّة ريف",
      headline: "وفّر حتى 35٪ عند الشراء بكميّات",
      body: "للأفراد والعائلات · بدون حد أدنى للطلب",
      gradient:
        "linear-gradient(135deg, hsl(220 60% 18%), hsl(200 50% 30%) 60%, hsl(40 80% 55%))",
    },
    quickActions: [
      { icon: "BadgePercent", label: "خصم 35٪", action: "toast", payload: "اشترك الآن للحصول على الخصم" },
      { icon: "Boxes", label: "عبوات وفر", action: "toast", payload: "تصفح العبوات الكبيرة" },
      { icon: "Truck", label: "توصيل مجاني", action: "toast", payload: "للأعضاء فوق 200 ج.م" },
    ],
    layoutVariant: "standard",
  },
  village: {
    slug: "village",
    themeKey: "village",
    title: "منتجات القرية",
    subtitle: "خيرات الريف الأصيلة من المزارعين مباشرة",
    searchPlaceholder: "ابحث في خيرات القرية…",
    hero: {
      eyebrow: "طبيعي 100٪",
      headline: "عبق الريف",
      body: "منتجات بلدية من مزارعين موثوقين",
    },
    layoutVariant: "standard",
  },
  baskets: {
    slug: "baskets",
    themeKey: "baskets",
    title: "سلال الريف",
    subtitle: "وفّر حتى 25٪ مع سلال جاهزة لكل أسبوع",
    searchPlaceholder: "ابحث في السلال…",
    hero: {
      eyebrow: "وفّر بالكمية",
      headline: "سلال جاهزة بأسعار تشبه أسعار الجملة",
      body: "استبدل أي صنف · اشترك واحصل على كاشباك حتى 8٪",
    },
    quickActions: [
      { icon: "PackagePlus", label: "ابني سلتك", action: "navigate", payload: "/store/baskets-build" },
      { icon: "CalendarClock", label: "اشتراكاتي", action: "navigate", payload: "/store/baskets-subs" },
    ],
    layoutVariant: "basket-builder",
  },
  subscriptions: {
    slug: "subscriptions",
    themeKey: "subscriptions",
    title: "اشتراكات التغذية",
    subtitle: "وجبات مخططة لأهدافك الصحية",
    searchPlaceholder: "ابحث في الخطط الغذائية…",
    hero: {
      eyebrow: "تغذية ذكية",
      headline: "خطط غذائية مخصصة لهدفك",
      body: "خسارة وزن · بناء عضلات · عائلية",
    },
    layoutVariant: "subscription-builder",
  },
  "school-library": {
    slug: "school-library",
    themeKey: "library",
    title: "مكتبة الطلبة",
    subtitle: "قرطاسية، كتب، وخدمات تصوير",
    searchPlaceholder: "ابحث عن قلم، كتاب، أو حقيبة…",
    hero: {
      eyebrow: "عودة المدارس",
      headline: "كل ما يحتاجه طالبك في مكان واحد",
      body: "قرطاسية · كتب · تصوير · حقائب",
    },
    quickActions: [
      { icon: "Printer", label: "خدمة التصوير والطباعة", action: "toast", payload: "تم فتح خدمة التصوير. ارفع ملفك من هنا." },
    ],
    layoutVariant: "standard",
  },
  recipes: {
    slug: "recipes",
    themeKey: "recipes",
    title: "وصفات ومكونات",
    subtitle: "مكونات الوصفات الشعبية جاهزة معبأة",
    searchPlaceholder: "ابحث في الوصفات…",
    hero: {
      eyebrow: "طبخ ذكي",
      headline: "مكونات وصفتك جاهزة معبأة",
      body: "اختر الوصفة ويصلك كل شيء دفعة واحدة",
    },
    layoutVariant: "standard",
  },
};

/** Lookup helper. Returns undefined for unknown slugs (caller decides fallback). */
export function getSectionIdentity(slug: string): SectionIdentity | undefined {
  return SECTION_IDENTITY_REGISTRY[slug];
}

/** Type-safe list of registered slugs (handy for tests / sitemap). */
export const REGISTERED_SECTION_SLUGS = Object.keys(SECTION_IDENTITY_REGISTRY) as ReadonlyArray<string>;
