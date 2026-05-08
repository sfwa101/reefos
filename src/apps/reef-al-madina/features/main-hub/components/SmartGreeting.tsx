/**
 * SmartGreeting — Phase 26 (Islamic + Admin-controlled sub-message).
 *
 * Time-aware Islamic salutation + a sub-line read from the
 * `app_settings.greeting_subline` admin-controlled JSONB so marketing can
 * change tone without a code deploy. Falls back to a curated rotation.
 */
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSystemSetting } from "@/hooks/useSystemSettings";

type Slot = "fajr" | "morning" | "noon" | "asr" | "maghrib" | "isha";

const slotFromHour = (h: number): Slot => {
  if (h < 5) return "isha";
  if (h < 7) return "fajr";
  if (h < 12) return "morning";
  if (h < 15) return "noon";
  if (h < 18) return "asr";
  if (h < 21) return "maghrib";
  return "isha";
};

const greetings: Record<Slot, { hi: string[]; sub: string[]; emoji: string }> = {
  fajr: {
    hi: ["أسعد الله صباحك", "صبّحك الله بالخير", "أنار الله يومك"],
    sub: [
      "بداية مباركة بإذن الله — جهّز قائمة اليوم بسكينة 🤲",
      "رزقاً طيباً وسعياً مشكوراً 🌿",
      "اللهم بارك لنا في يومنا — فطورك على بُعد لمسة ☕",
    ],
    emoji: "🌅",
  },
  morning: {
    hi: ["أسعد الله صباحك", "صبّحك الله بالخير", "حيّاك الله"],
    sub: [
      "حياك الله — فطور طازج يملأ يومك بالبركة 🌿",
      "نوصّلك أفضل المنتجات بأقل سعر، بإذن الله ✨",
      "قائمة اليوم جاهزة — اضغط واطلب براحتك 🛒",
    ],
    emoji: "✨",
  },
  noon: {
    hi: ["حيّاك الله", "أسعد الله أوقاتك", "أهلاً بعودتك"],
    sub: [
      "نهارك مبارك — اختر غداء يليق بك ووصلناك سريعاً 🍲",
      "لا تنسَ ذكر الله — وغداؤك في طريقه 🤲",
      "وفّر وقتك — اطلب الآن وخذ راحتك ☀️",
    ],
    emoji: "☀️",
  },
  asr: {
    hi: ["أهلاً بعودتك", "طاب وقتك", "حيّاك الله"],
    sub: [
      "وقت كوب شاي وقطعة حلوى — على راحتك 🍵",
      "استراحة قصيرة، وطلبك يصل قبل المغرب 🌤️",
      "اللهم اجعل بقية يومنا خيراً مما مضى 🤲",
    ],
    emoji: "🌤️",
  },
  maghrib: {
    hi: ["أنار الله مساءك", "مسّاك الله بالخير", "طاب مساؤك"],
    sub: [
      "تقبّل الله — عشاء العائلة على بُعد ضغطة 🌙",
      "اللهم بارك لنا فيما رزقتنا — اطلب بسكينة 🤲",
      "ابدأ مساءك بهدوء — نحن نوصّل عنك ✨",
    ],
    emoji: "🌙",
  },
  isha: {
    hi: ["مسّاك الله بالنور", "أنار الله مساءك", "طاب ليلك"],
    sub: [
      "جهّز سلة الغد الآن، توصلك أول الصباح ⭐",
      "اللهم اجعل آخر كلامنا لا إله إلا الله 🤲",
      "نومٌ هانئ بإذن الله — وطلبك بانتظارك صباحاً 🌙",
    ],
    emoji: "⭐",
  },
};

const pickFromSlot = (arr: string[]): string => {
  // Stable per-15-min window so it feels alive but not jittery on re-renders.
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  return arr[bucket % arr.length] ?? arr[0]!;
};

const firstName = (full: string | null | undefined): string => {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
};

type AdminSubline = { enabled?: boolean; text?: string } | null;

export const SmartGreeting = () => {
  const { profile } = useAuth();
  const slot = useMemo(() => slotFromHour(new Date().getHours()), []);
  const g = greetings[slot];
  const hi = useMemo(() => pickFromSlot(g.hi), [g.hi]);
  const rotatedSub = useMemo(() => pickFromSlot(g.sub), [g.sub]);
  const name = firstName(profile?.full_name);

  // Admin-controlled override (single source of truth: app_settings).
  const { value: adminSub } = useSystemSetting<AdminSubline>("greeting_subline", null);
  const sub = adminSub?.enabled && adminSub?.text ? adminSub.text : rotatedSub;

  return (
    <header dir="rtl" className="px-1 pt-1 animate-float-up">
      <h1 className="font-display text-2xl font-black leading-tight text-foreground">
        {hi}
        {name ? `، ${name}` : ""} <span aria-hidden>{g.emoji}</span>
      </h1>
      <p className="mt-1 text-[13px] font-medium text-muted-foreground">{sub}</p>
    </header>
  );
};

export default SmartGreeting;
