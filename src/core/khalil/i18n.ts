/**
 * Khalil — i18n runtime (P2.1 scaffold).
 *
 * Per p1-i18n-strategy.md: zero string literals in TSX. Every visible copy
 * goes through `kt(key)`. Today only Arabic is implemented; locale switch
 * lands when a second locale is requested via ADR.
 *
 * Keys are flat dotted strings: `khalil.<area>.<element>`.
 */
const AR: Readonly<Record<string, string>> = Object.freeze({
  "khalil.brand.name": "خليل",
  "khalil.brand.tagline": "نظام التحول السيادي الموجَّه بالذكاء",

  "khalil.nav.home": "البيت",
  "khalil.nav.prayer": "الصلاة",
  "khalil.nav.habits": "العادات",
  "khalil.nav.workout": "التمرين",
  "khalil.nav.weight": "الوزن",
  "khalil.nav.insights": "البصائر",
  "khalil.nav.coach": "المرافق",

  "khalil.state.loading": "لحظة…",
  "khalil.state.empty.title": "لا شيء هنا بعد",
  "khalil.state.empty.body": "ابدأ أول لبنة لتظهر هنا.",
  "khalil.state.error.title": "حدث خلل",
  "khalil.state.error.body": "حاول مجدداً بعد قليل.",
  "khalil.state.error.retry": "إعادة المحاولة",

  "khalil.home.welcome": "أهلاً بك في خليل",
  "khalil.home.phase.note":
    "هذا هيكل التشغيل الأساسي. القدرات الفعلية تُضاف في الأطوار التالية وفق الحَوكَمة.",

  "khalil.placeholder.coming_soon": "قيد البناء وفق الحَوكَمة",

  "khalil.action.back_home": "العودة إلى ريف المدينة",
});

const DICT: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  ar: AR,
});

const FALLBACK_LOCALE = "ar";

export type KhalilLocale = keyof typeof DICT;

let activeLocale: KhalilLocale = FALLBACK_LOCALE;

export function setKhalilLocale(locale: KhalilLocale): void {
  activeLocale = locale;
}

export function getKhalilLocale(): KhalilLocale {
  return activeLocale;
}

/**
 * Translate a Khalil i18n key. Unknown keys return the key itself in dev
 * (visible signal to add it) and a quiet empty string in prod.
 */
export function kt(key: string): string {
  const dict = DICT[activeLocale] ?? AR;
  const v = dict[key];
  if (v != null) return v;
  if (import.meta.env.DEV) return `⟦${key}⟧`;
  return "";
}
