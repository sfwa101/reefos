/**
 * Khalil — i18n runtime.
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

  // Prayer pillar (P2.2)
  "khalil.prayer.block.title": "صلوات اليوم",
  "khalil.prayer.block.subtitle": "اضغط لتسجيل ما صليّت في وقته.",
  "khalil.prayer.offline.pending": "في انتظار المزامنة",
  "khalil.prayer.name.fajr": "الفجر",
  "khalil.prayer.name.dhuhr": "الظهر",
  "khalil.prayer.name.asr": "العصر",
  "khalil.prayer.name.maghrib": "المغرب",
  "khalil.prayer.name.isha": "العشاء",

  // Habit pillar (P2.3)
  "khalil.habit.block.title": "عادات اليوم",
  "khalil.habit.block.subtitle": "أتمم ما تيسّر؛ القليل المتواصل خير.",
  "khalil.habit.empty.title": "لم تُعرَّف عادة بعد",
  "khalil.habit.empty.body": "ابدأ بعادة صغيرة واحدة، وأضف لاحقاً.",
  "khalil.habit.action.done": "تمّت",
  "khalil.habit.action.complete": "أكمل",
  "khalil.habit.offline.pending": "في انتظار المزامنة",
  "khalil.habit.error.recovery_required": "السماح بالأمس يستلزم وضع التعافي.",
  "khalil.habit.error.future_date": "لا يمكن تسجيل يوم لم يأتِ بعد.",
  "khalil.habit.error.stale_date": "هذا اليوم خارج النافذة المسموح بها.",
  "khalil.habit.error.invalid_partial": "قيمة الإنجاز غير صحيحة.",

  // Recovery pillar (P2.4)
  "khalil.recovery.title": "وضع التعافي",
  "khalil.recovery.subtitle":
    "مساحة هادئة للعودة دون عقوبة. لا خسارة، لا عتاب.",
  "khalil.recovery.banner.soft": "أنت في وضع التعافي اللطيف. سَرعتك مقبولة.",
  "khalil.recovery.banner.hard":
    "أنت في وضع التعافي العميق. لا مسؤوليات إضافية اليوم.",
  "khalil.recovery.state.off": "نشِط",
  "khalil.recovery.state.soft": "تعافٍ لطيف",
  "khalil.recovery.state.hard": "تعافٍ عميق",
  "khalil.recovery.action.to_soft": "ادخل تعافياً لطيفاً",
  "khalil.recovery.action.to_hard": "ادخل تعافياً عميقاً",
  "khalil.recovery.action.to_off": "اخرج من التعافي",
  "khalil.recovery.reason.label": "سبب الانتقال (مطلوب للتعافي العميق)",
  "khalil.recovery.reason.placeholder": "اكتب سبباً قصيراً يذكّرك لاحقاً…",
  "khalil.recovery.audit.title": "سجل التحولات",
  "khalil.recovery.audit.empty": "لا تحولات سابقة.",
  "khalil.recovery.offline.pending": "في انتظار المزامنة",
  "khalil.recovery.error.same_state": "أنت في هذه الحالة بالفعل.",
  "khalil.recovery.error.illegal_transition":
    "هذا الانتقال غير مسموح. مرّ بالتعافي اللطيف أولاً.",
  "khalil.recovery.error.reason_required":
    "التعافي العميق يستلزم سبباً قصيراً.",
  "khalil.recovery.entered_at": "منذ:",

  // Identity engine (P2.5) — calm, non-gamified phrasing.
  "khalil.identity.title": "هويتك التحوّلية",
  "khalil.identity.subtitle":
    "حالة موثَّقة من الخادم، تعكس استمرارك لا لحظة حماسك.",
  "khalil.identity.level.seed": "بذرة",
  "khalil.identity.level.stable": "ثابت",
  "khalil.identity.level.rising": "صاعد",
  "khalil.identity.level.disciplined": "منضبط",
  "khalil.identity.level.sovereign": "سيِّد نفسه",
  "khalil.identity.chip.label": "الهوية الآن",
  "khalil.identity.chip.score": "النَسَق",
  "khalil.identity.chip.next": "العتبة التالية",
  "khalil.identity.chip.top": "بلغت أعلى مستوى متاح في هذه المرحلة.",
  "khalil.identity.action.recompute": "أعد الحساب",
  "khalil.identity.action.recomputing": "جارِ الحساب…",
  "khalil.identity.windows.title": "نوافذ القياس",
  "khalil.identity.windows.w30": "٣٠ يوماً",
  "khalil.identity.windows.w90": "٩٠ يوماً",
  "khalil.identity.windows.w180": "١٨٠ يوماً",
  "khalil.identity.observed_days": "أيام مرصودة:",
  "khalil.identity.last_computed_at": "آخر حساب:",
  "khalil.identity.note":
    "لا منافسة، لا أوسمة. الهوية تنمو عبر الالتزام الطويل وحده.",

  // Coach pillar (P2.6) — proposal/dispose only. No conversation.
  "khalil.coach.title": "المرافق",
  "khalil.coach.subtitle":
    "اقتراحات هادئة لا تنفّذ من تلقاء نفسها. أنت من يقبل أو يصرف.",
  "khalil.coach.block.title": "اقتراح اليوم",
  "khalil.coach.block.subtitle": "اقتراح واحد فقط، بلا ضوضاء.",
  "khalil.coach.action.accept": "اقبل",
  "khalil.coach.action.dismiss": "اصرف",
  "khalil.coach.action.refresh": "اطلب اقتراحاً",
  "khalil.coach.state.empty": "لا اقتراح فعّال. كل شيء هادئ.",
  "khalil.coach.state.expired": "انتهى وقت هذا الاقتراح.",
  "khalil.coach.state.accepted": "قُبِل.",
  "khalil.coach.state.dismissed": "صُرِف.",
  "khalil.coach.history.title": "اقتراحات سابقة",
  "khalil.coach.history.empty": "لا اقتراحات سابقة بعد.",
  "khalil.coach.offline.pending": "في انتظار المزامنة",
  "khalil.coach.note":
    "المرافق لا يكتب في حسابك. هو يقترح فقط؛ التنفيذ يبقى بيدك.",

  // Coach copy registry (allowlisted i18n keys returned by the model).
  "khalil.coach.copy.calm_breath": "نَفَس هادئ يكفي الآن",
  "khalil.coach.copy.gentle_return": "عُد بهدوء، خطوة واحدة تكفي",
  "khalil.coach.copy.one_small_step": "ابدأ بأصغر فعل ممكن",
  "khalil.coach.copy.rest_today": "اليوم للراحة، لا للعتاب",
  "khalil.coach.copy.steady_pace": "حافظ على إيقاعك، السرعة ليست المطلوب",
  "khalil.coach.copy.quiet_day": "يوم هادئ — كل شيء يسير بثبات",
  "khalil.coach.body.quiet_day":
    "لا حاجة لفعل إضافي اليوم. تابع ما تفعله من غير ضجيج.",

  // Coach proposal kinds (labels in history list).
  "khalil.coach.kind.gentle-reminder": "تذكير لطيف",
  "khalil.coach.kind.recovery-suggestion": "اقتراح تعافٍ",
  "khalil.coach.kind.pillar-rebalance-hint": "إعادة توازن",
  "khalil.coach.kind.consistency-guidance": "إرشاد استمرار",
  "khalil.coach.kind.quiet-day": "يوم هادئ",
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
