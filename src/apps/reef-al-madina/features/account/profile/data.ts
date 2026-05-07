import {
  Apple, Baby, Briefcase, ChefHat, Coins, Crown, Drumstick, Flower2,
  GraduationCap, Heart, Home, Image as ImageIcon, Leaf, PiggyBank, Salad,
  ShoppingBag, Stars, Trophy, User2, Wallet, Zap,
} from "lucide-react";
import type {
  AvatarOption, BudgetOption, Gender, IconOption, SimpleOption, TabKey,
} from "./types";
import type { LucideIcon } from "lucide-react";

export const genderOptions: Array<{ value: Exclude<Gender, "unspecified">; label: string }> = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

export const occupations: IconOption[] = [
  { value: "student", label: "طالب / طالبة", icon: GraduationCap },
  { value: "homemaker", label: "ربّة منزل", icon: Home },
  { value: "employee", label: "موظف / موظفة", icon: Briefcase },
  { value: "owner", label: "صاحب عمل", icon: Crown },
  { value: "teacher", label: "كادر تعليمي", icon: ChefHat },
  { value: "other", label: "أخرى", icon: Stars },
];

export const lifestyleTags: IconOption[] = [
  { value: "organic", label: "منتجات عضوية", icon: Leaf },
  { value: "quick", label: "وجبات سريعة التحضير", icon: Zap },
  { value: "sweets", label: "محبّ للحلويات", icon: Apple },
  { value: "healthy", label: "نظام غذائي صحي", icon: Salad },
  { value: "meat", label: "محبّ للحوم", icon: Drumstick },
  { value: "kids", label: "منتجات أطفال", icon: Baby },
  { value: "beauty", label: "العناية والجمال", icon: Flower2 },
  { value: "bulk", label: "تسوّق بالجملة", icon: ShoppingBag },
];

export const likeOptions: SimpleOption[] = [
  { value: "discounts", label: "العروض والخصومات" },
  { value: "newproducts", label: "المنتجات الجديدة" },
  { value: "bundles", label: "حزم العائلة" },
  { value: "premium", label: "الجودة المميّزة" },
  { value: "local", label: "المنتجات المحلية" },
];

export const dislikeOptions: SimpleOption[] = [
  { value: "ads", label: "الإعلانات المتكررة" },
  { value: "outofstock", label: "نفاد المخزون" },
  { value: "slow", label: "بطء التوصيل" },
  { value: "complex", label: "خطوات الشراء الطويلة" },
];

export const budgetRanges: BudgetOption[] = [
  { value: "saver", label: "أقتصد قدر الإمكان", hint: "أركّز على العروض والأسعار", icon: PiggyBank },
  { value: "balanced", label: "متوازن", hint: "جودة جيدة بسعر مناسب", icon: Wallet },
  { value: "premium", label: "أهتم بالجودة أولاً", hint: "أفضّل الأفخم ولو أعلى سعرًا", icon: Crown },
  { value: "skip", label: "أفضّل عدم التحديد", hint: "أرني كل شيء", icon: Coins },
];

export const AVATAR_GALLERY: AvatarOption[] = [
  { key: "leaf", icon: Leaf, label: "طبيعة" },
  { key: "chef", icon: ChefHat, label: "شيف" },
  { key: "crown", icon: Crown, label: "ملكي" },
  { key: "stars", icon: Stars, label: "نجوم" },
  { key: "flower", icon: Flower2, label: "زهرة" },
  { key: "trophy", icon: Trophy, label: "بطل" },
  { key: "home", icon: Home, label: "منزل" },
  { key: "apple", icon: Apple, label: "تفاح" },
];

export const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon }> = [
  { key: "identity", label: "الهوية", icon: User2 },
  { key: "lifestyle", label: "النمط", icon: Heart },
  { key: "budget", label: "الميزانية", icon: Wallet },
  { key: "avatar", label: "الصورة", icon: ImageIcon },
];
