// i18n stem-cell — central dictionary for all Settings copy.
// Adding English keys later is purely additive; no component change.

export type Locale = "ar" | "en";

export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export const LOCALE_LABEL: Record<Locale, string> = {
  ar: "العربية",
  en: "English",
};

type Dict = Record<string, string>;

const ar: Dict = {
  "settings.title": "الإعدادات",
  "settings.subtitle": "المظهر، اللغة، والإشعارات",
  "settings.account": "حسابي",

  "settings.mode": "الوضع",
  "settings.mode.light": "فاتح",
  "settings.mode.dark": "داكن",
  "settings.mode.system": "النظام",

  "settings.themes.natural": "ثيمات طبيعية",
  "settings.themes.cute": "ثيمات لطيفة ✿",
  "settings.themes.premium": "ثيمات داكنة فاخرة ✦",
  "settings.themes.apple": "زجاج آبل ◐",

  "settings.a11y": "إمكانية الوصول",
  "settings.a11y.simplified": "الوضع المبسّط",
  "settings.a11y.simplified.hint": "خط أكبر وتباين أعلى — مناسب لكبار السن",

  "settings.preferences": "التفضيلات",
  "settings.preferences.lang": "لغة التطبيق",
  "settings.preferences.notifications": "التنبيهات",
  "settings.preferences.notifications.sub": "إدارة العروض والإشعارات",

  "settings.lang.sheet.title": "اختر لغة التطبيق",
  "settings.lang.sheet.hint": "سيتم تطبيق التغيير فوراً",

  "themes.sage": "ريفي",
  "themes.ocean": "محيطي",
  "themes.amber": "كهرماني",
  "themes.midnight": "ليلي",
  "themes.blush": "وردي ناعم",
  "themes.lavender": "لافندر",
  "themes.mint": "نعناعي",
  "themes.peach": "خوخي",
  "themes.plum": "بنفسجي ملكي",
  "themes.navy": "أزرق ليلي",
  "themes.apple": "آبل فاتح",
  "themes.graphite": "آبل داكن",
};

const en: Dict = {
  "settings.title": "Settings",
  "settings.subtitle": "Appearance, language, and notifications",
  "settings.account": "Account",

  "settings.mode": "Mode",
  "settings.mode.light": "Light",
  "settings.mode.dark": "Dark",
  "settings.mode.system": "System",

  "settings.themes.natural": "Natural",
  "settings.themes.cute": "Soft ✿",
  "settings.themes.premium": "Premium Dark ✦",
  "settings.themes.apple": "Apple Glass ◐",

  "settings.a11y": "Accessibility",
  "settings.a11y.simplified": "Simplified Mode",
  "settings.a11y.simplified.hint": "Larger text and higher contrast",

  "settings.preferences": "Preferences",
  "settings.preferences.lang": "App language",
  "settings.preferences.notifications": "Notifications",
  "settings.preferences.notifications.sub": "Manage offers and alerts",

  "settings.lang.sheet.title": "Choose app language",
  "settings.lang.sheet.hint": "The change applies instantly",

  "themes.sage": "Sage",
  "themes.ocean": "Ocean",
  "themes.amber": "Amber",
  "themes.midnight": "Midnight",
  "themes.blush": "Blush",
  "themes.lavender": "Lavender",
  "themes.mint": "Mint",
  "themes.peach": "Peach",
  "themes.plum": "Royal Plum",
  "themes.navy": "Deep Navy",
  "themes.apple": "Apple Light",
  "themes.graphite": "Apple Dark",
};

export const DICTIONARIES: Record<Locale, Dict> = { ar, en };
