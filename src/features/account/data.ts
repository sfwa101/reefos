import {
  User, MapPin, CreditCard, Bell, Heart, ShoppingBag, Settings, HelpCircle,
  ShieldCheck, Users2,
  type LucideIcon,
} from "lucide-react";

export type TierVisual = { mesh: string; ink: string; shine: string; glow: string };

export const TIER_VISUALS: Record<string, TierVisual> = {
  bronze: {
    mesh:
      "radial-gradient(at 18% 22%, hsl(28 75% 70%) 0px, transparent 55%)," +
      "radial-gradient(at 80% 16%, hsl(36 85% 75%) 0px, transparent 55%)," +
      "radial-gradient(at 60% 90%, hsl(20 60% 38%) 0px, transparent 65%)," +
      "linear-gradient(135deg, hsl(28 60% 60%), hsl(20 55% 36%))",
    ink: "0 0% 100%",
    shine: "linear-gradient(115deg, transparent 30%, hsl(40 85% 90% / 0.45) 45%, transparent 60%)",
    glow: "hsl(28 80% 55% / 0.45)",
  },
  silver: {
    mesh:
      "radial-gradient(at 20% 18%, hsl(220 15% 92%) 0px, transparent 55%)," +
      "radial-gradient(at 80% 20%, hsl(210 12% 80%) 0px, transparent 55%)," +
      "radial-gradient(at 60% 90%, hsl(220 10% 50%) 0px, transparent 65%)," +
      "linear-gradient(135deg, hsl(220 10% 80%), hsl(220 10% 48%))",
    ink: "220 30% 18%",
    shine: "linear-gradient(115deg, transparent 30%, hsl(0 0% 100% / 0.55) 45%, transparent 60%)",
    glow: "hsl(220 10% 70% / 0.4)",
  },
  gold: {
    mesh:
      "radial-gradient(at 18% 18%, hsl(48 95% 78%) 0px, transparent 55%)," +
      "radial-gradient(at 82% 22%, hsl(38 90% 70%) 0px, transparent 55%)," +
      "radial-gradient(at 55% 92%, hsl(28 80% 45%) 0px, transparent 65%)," +
      "linear-gradient(135deg, hsl(45 95% 65%), hsl(32 85% 48%))",
    ink: "30 60% 18%",
    shine: "linear-gradient(115deg, transparent 30%, hsl(50 100% 95% / 0.6) 45%, transparent 60%)",
    glow: "hsl(45 95% 60% / 0.55)",
  },
  platinum: {
    mesh:
      "radial-gradient(at 20% 20%, hsl(195 80% 88%) 0px, transparent 55%)," +
      "radial-gradient(at 80% 22%, hsl(220 65% 80%) 0px, transparent 55%)," +
      "radial-gradient(at 55% 92%, hsl(220 35% 35%) 0px, transparent 65%)," +
      "linear-gradient(135deg, hsl(200 60% 78%), hsl(220 40% 45%))",
    ink: "220 50% 16%",
    shine: "linear-gradient(115deg, transparent 30%, hsl(200 100% 96% / 0.6) 45%, transparent 60%)",
    glow: "hsl(200 70% 60% / 0.5)",
  },
  vip: {
    mesh:
      "radial-gradient(at 18% 20%, hsl(285 80% 70%) 0px, transparent 55%)," +
      "radial-gradient(at 82% 18%, hsl(330 85% 65%) 0px, transparent 55%)," +
      "radial-gradient(at 50% 92%, hsl(45 90% 55%) 0px, transparent 65%)," +
      "linear-gradient(135deg, hsl(290 65% 50%), hsl(330 70% 50%) 60%, hsl(38 90% 55%))",
    ink: "0 0% 100%",
    shine: "linear-gradient(115deg, transparent 30%, hsl(45 100% 90% / 0.55) 45%, transparent 60%)",
    glow: "hsl(310 80% 60% / 0.55)",
  },
};

export type SettingItem = {
  icon: LucideIcon;
  label: string;
  sub: string;
  to:
    | "/account/profile"
    | "/account/verification"
    | "/account/addresses"
    | "/account/payments"
    | "/account/orders"
    | "/account/favorites"
    | "/account/notifications"
    | "/account/settings"
    | "/account/help";
};

export const SETTING_GROUPS: { title: string; items: SettingItem[] }[] = [
  {
    title: "بياناتي الشخصية",
    items: [
      { icon: User, label: "البيانات الشخصية", sub: "الاسم، النوع، تاريخ الميلاد", to: "/account/profile" },
      { icon: MapPin, label: "العناوين", sub: "إدارة عناوين التوصيل", to: "/account/addresses" },
      { icon: CreditCard, label: "وسائل الدفع", sub: "بطاقات والمحفظة", to: "/account/payments" },
    ],
  },
  {
    title: "الأمان والتوثيق",
    items: [
      { icon: ShieldCheck, label: "توثيق الحساب", sub: "الرقم القومي وصورة الهوية", to: "/account/verification" },
      { icon: Bell, label: "التنبيهات", sub: "العروض والوصول", to: "/account/notifications" },
    ],
  },
  {
    title: "التفضيلات والمساعدة",
    items: [
      { icon: Settings, label: "الإعدادات", sub: "اللغة، الوضع، الألوان", to: "/account/settings" },
      { icon: HelpCircle, label: "المساعدة والدعم", sub: "تواصل معنا", to: "/account/help" },
      { icon: Heart, label: "المفضلة", sub: "منتجاتك المحفوظة", to: "/account/favorites" },
    ],
  },
];

export const ACTION_HUB: { icon: LucideIcon; label: string; to: SettingItem["to"]; tone: string }[] = [
  { icon: ShoppingBag, label: "طلباتي", to: "/account/orders", tone: "primary" },
  { icon: Heart, label: "المفضلة", to: "/account/favorites", tone: "destructive" },
  { icon: MapPin, label: "العناوين", to: "/account/addresses", tone: "accent" },
];
