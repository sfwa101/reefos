/**
 * SmartGreeting — personalized header above the search bar.
 *
 * Reads `profile.full_name` from AuthContext and the local hour of day
 * to generate a time-aware greeting + a contextual sub-line. Pure
 * presentation — zero hardcoded user data.
 */
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

type Slot = "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";

const slotFromHour = (h: number): Slot => {
  if (h < 5) return "night";
  if (h < 11) return "morning";
  if (h < 14) return "noon";
  if (h < 17) return "afternoon";
  if (h < 22) return "evening";
  return "night";
};

const greetings: Record<Slot, { hi: string; sub: string; emoji: string }> = {
  dawn:      { hi: "صباح النور",  sub: "بداية مباركة — جهّز قائمة اليوم بهدوء 🌅", emoji: "🌅" },
  morning:   { hi: "صباح الخير",  sub: "جاهز لفطور طازج يملأ يومك بالطاقة؟ 🍳",  emoji: "✨" },
  noon:      { hi: "نهارك سعيد",  sub: "اختر غداء يليق بك — وصلناك في دقائق 🍲",  emoji: "☀️" },
  afternoon: { hi: "أهلاً بعودتك", sub: "وقت كوب شاي وقطعة حلوى — على راحتك 🍵",  emoji: "🌤️" },
  evening:   { hi: "مساء الخير",  sub: "عشاء العائلة على بُعد ضغطة — جهّزناه لك 🌙", emoji: "🌙" },
  night:     { hi: "مساء الهدوء", sub: "جهّز سلة الغد الآن، توصلك أول الصباح ⭐",  emoji: "⭐" },
};

const firstName = (full: string | null | undefined): string => {
  if (!full) return "";
  return full.trim().split(/\s+/)[0] ?? "";
};

export const SmartGreeting = () => {
  const { profile } = useAuth();
  const slot = useMemo(() => slotFromHour(new Date().getHours()), []);
  const g = greetings[slot];
  const name = firstName(profile?.full_name);

  return (
    <header dir="rtl" className="px-1 pt-1 animate-float-up">
      <h1 className="font-display text-2xl font-black leading-tight text-foreground">
        {g.hi}
        {name ? `، ${name}` : ""} <span aria-hidden>{g.emoji}</span>
      </h1>
      <p className="mt-1 text-[13px] font-medium text-muted-foreground">
        {g.sub}
      </p>
    </header>
  );
};

export default SmartGreeting;
