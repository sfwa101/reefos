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

const greetings: Record<Slot, { hi: string; sub: string; emoji: string }> = {
  fajr:    { hi: "أنار الله يومك",  sub: "بداية مباركة بإذن الله — جهّز قائمة اليوم بسكينة 🤲", emoji: "🌅" },
  morning: { hi: "صباح الخير",      sub: "حياك الله — فطور طازج يملأ يومك بالبركة 🌿",            emoji: "✨" },
  noon:    { hi: "حياك الله",       sub: "نهارك مبارك — اختر غداء يليق بك ووصلناك سريعاً 🍲",     emoji: "☀️" },
  asr:     { hi: "أهلاً بعودتك",    sub: "وقت كوب شاي وقطعة حلوى — على راحتك 🍵",                  emoji: "🌤️" },
  maghrib: { hi: "مساء الخير",      sub: "تقبّل الله — عشاء العائلة على بُعد ضغطة 🌙",            emoji: "🌙" },
  isha:    { hi: "مساء النور",      sub: "جهّز سلة الغد الآن، توصلك أول الصباح ⭐",                emoji: "⭐" },
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
  const name = firstName(profile?.full_name);

  // Admin-controlled override (single source of truth: app_settings).
  const { value: adminSub } = useSystemSetting<AdminSubline>("greeting_subline", null);
  const sub = adminSub?.enabled && adminSub?.text ? adminSub.text : g.sub;

  return (
    <header dir="rtl" className="px-1 pt-1 animate-float-up">
      <h1 className="font-display text-2xl font-black leading-tight text-foreground">
        {g.hi}
        {name ? `، ${name}` : ""} <span aria-hidden>{g.emoji}</span>
      </h1>
      <p className="mt-1 text-[13px] font-medium text-muted-foreground">{sub}</p>
    </header>
  );
};

export default SmartGreeting;
