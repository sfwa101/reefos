// Recipes module — pure data + helpers (no React).
// Extracted from src/pages/store/Recipes.tsx for code-split & DRY.

import { Sun, Sunset, Moon, type LucideIcon } from "lucide-react";
import pChicken from "@/assets/p-grilled-chicken.jpg";
import pSalmon from "@/assets/p-salmon.jpg";
import pRisotto from "@/assets/p-risotto.jpg";
import pBowl from "@/assets/p-bowl.jpg";
import pEggs from "@/assets/p-eggs.jpg";
import pCereal from "@/assets/p-cereal.jpg";
import pBread from "@/assets/p-bread.jpg";
import pPasta from "@/assets/p-pasta.jpg";
import pBeef from "@/assets/p-beef.jpg";

export type RecipeSection = "إفطار" | "غداء" | "عشاء";

export type Recipe = {
  id: string;
  name: string;
  section: RecipeSection;
  category: string;
  image: string;
  basePrice: number;
  baseServings: number;
  cookTime: number;
  calories: number;
  ingredients: { id: string; name: string; cost: number; essential?: boolean }[];
};

export type Nutrition = { protein: number; carbs: number; fat: number; fiber: number };
export type ToolItem = {
  id: string;
  name: string;
  productId?: string;
  fallbackId?: string;
  price?: number;
  image?: string;
  alternatives?: string[];
};
export type RecipeContent = {
  nutrition: Nutrition;
  prepTime: number;
  difficulty: "سهل" | "متوسط" | "متقدم";
  videoUrl?: string;
  steps: string[];
  tools: ToolItem[];
};

export type Marketing = {
  oldPrice?: number;
  soldToday?: number;
  remaining?: number;
  badge?: "الأكثر طلبًا" | "جديد" | "توصية الشيف" | "صحي" | "وفّر";
};

const TOOLS = {
  pan:       { id: "t-pan",       name: "مقلاة تيفال ٢٤سم",       productId: "kt-pan-24",                              alternatives: ["أي مقلاة قاعها سميك"] },
  nonstick:  { id: "t-nonstick",  name: "مقلاة جرانيت غير لاصقة", productId: "kt-pan-granite", fallbackId: "kt-pan-24", alternatives: ["مقلاة تيفال عادية"] },
  pot:       { id: "t-pot",       name: "حلة استانلس ٤ لتر",       productId: "kt-pot-4l",                              alternatives: ["أي حلة بقاع سميك"] },
  ovenTray:  { id: "t-tray",      name: "صينية فرن مينا",          productId: "kt-tray-bake",                           alternatives: ["صينية ألومنيوم"] },
  grill:     { id: "t-grill",     name: "مشواية حديد مضلعة",       productId: "kt-grill-pan", fallbackId: "kt-tray-bake", alternatives: ["صينية فرن", "شواية كهربائية"] },
  blender:   { id: "t-blender",   name: "خلاط كهربائي ٧٠٠وات",     productId: "kt-blender",   fallbackId: "kt-whisk",     alternatives: ["مضرب يدوي", "محضر طعام"] },
  bowl:      { id: "t-bowl",      name: "بول تقديم سيراميك",       productId: "kt-bowl-cer",                            alternatives: ["أي بول عميق"] },
  knife:     { id: "t-knife",     name: "سكين شيف ٢٠سم",           productId: "kt-knife-chef",                          alternatives: ["أي سكين حاد"] },
  board:     { id: "t-board",     name: "لوح تقطيع خشبي",          productId: "kt-board",                               alternatives: ["لوح بلاستيك"] },
  whisk:     { id: "t-whisk",     name: "مضرب يدوي",               productId: "kt-whisk",                               alternatives: ["شوكة كبيرة"] },
  measuring: { id: "t-measure",   name: "أكواب وملاعق قياس",        productId: "kt-measure",                             alternatives: ["تقدير يدوي"] },
} satisfies Record<string, ToolItem>;

export const RECIPE_CONTENT: Record<string, RecipeContent> = {
  "r-eggs": {
    nutrition: { protein: 22, carbs: 6, fat: 24, fiber: 2 },
    prepTime: 5, difficulty: "سهل",
    videoUrl: "https://www.youtube.com/embed/PUP7U5vTMM0",
    steps: [
      "اخفقي البيض مع الملح والفلفل في بول.",
      "سخّني المقلاة على نار متوسطة وأضيفي زيت الزيتون.",
      "اسكبي البيض ثم وزّعي الخضار والجبنة فوقه.",
      "اطوي الأومليت بلطف بعد ٣ دقائق وقدميه ساخنًا.",
    ],
    tools: [TOOLS.nonstick, TOOLS.whisk, TOOLS.bowl],
  },
  "r-cereal": {
    nutrition: { protein: 14, carbs: 58, fat: 9, fiber: 7 },
    prepTime: 5, difficulty: "سهل",
    steps: [
      "ضعي الزبادي اليوناني في قاع البول.",
      "أضيفي الجرانولا فوقه ثم الفواكه الموسمية.",
      "زيّني بالعسل والمكسرات وقدميه فورًا.",
    ],
    tools: [TOOLS.bowl, TOOLS.measuring],
  },
  "r-bread": {
    nutrition: { protein: 16, carbs: 36, fat: 22, fiber: 6 },
    prepTime: 5, difficulty: "سهل",
    steps: [
      "حمّصي شرائح الخبز قليلًا.",
      "اهرسي الأفوكادو مع الملح والليمون.",
      "وزّعي الأفوكادو على الخبز ثم شرائح الحلوم والطماطم.",
    ],
    tools: [TOOLS.knife, TOOLS.board, TOOLS.nonstick],
  },
  "r-chicken": {
    nutrition: { protein: 42, carbs: 38, fat: 18, fiber: 5 },
    prepTime: 15, difficulty: "متوسط",
    videoUrl: "https://www.youtube.com/embed/g0sXuc0wO5o",
    steps: [
      "تبّلي صدور الدجاج بالأعشاب والثوم والليمون لمدة ١٥ دقيقة.",
      "حمّري الدجاج على المشواية ٤ دقائق لكل جانب.",
      "اطهي الأرز البسمتي مع رشة ملح وزيت زيتون.",
      "حمّصي الخضار في الفرن مع زيت الزيتون لمدة ٢٠ دقيقة.",
      "قدّمي الدجاج فوق الأرز مع الخضار والصلصة الجانبية.",
    ],
    tools: [TOOLS.grill, TOOLS.pot, TOOLS.ovenTray, TOOLS.knife],
  },
  "r-pasta": {
    nutrition: { protein: 18, carbs: 62, fat: 24, fiber: 4 },
    prepTime: 8, difficulty: "سهل",
    videoUrl: "https://www.youtube.com/embed/Q6xpxDZUz4M",
    steps: [
      "اسلقي الباستا في ماء مملح حتى تنضج (al dente).",
      "حمّري الفطر مع الثوم في زيت زيتون.",
      "أضيفي الكريمة وحرّكي حتى تكثف الصلصة.",
      "أضيفي الباستا والبارميزان وحرّكي قبل التقديم.",
    ],
    tools: [TOOLS.pot, TOOLS.nonstick, TOOLS.measuring],
  },
  "r-bowl": {
    nutrition: { protein: 16, carbs: 48, fat: 18, fiber: 9 },
    prepTime: 10, difficulty: "سهل",
    steps: [
      "اطهي الكينوا حسب التعليمات واتركيها لتبرد قليلًا.",
      "حمّصي الحمص والخضار في الفرن مع زيت الزيتون.",
      "رتّبي البول: أوراق خضراء، كينوا، حمص، خضار، فيتا.",
      "أضيفي تتبيلة الطحينة وحبة البركة قبل التقديم.",
    ],
    tools: [TOOLS.bowl, TOOLS.ovenTray, TOOLS.pot],
  },
  "r-salmon": {
    nutrition: { protein: 38, carbs: 22, fat: 26, fiber: 4 },
    prepTime: 10, difficulty: "متوسط",
    videoUrl: "https://www.youtube.com/embed/scnq9oCXLwM",
    steps: [
      "تبّلي السلمون بالملح والفلفل والليمون.",
      "اشوي السلمون على نار متوسطة ٤ دقائق لكل جانب.",
      "اسلقي البطاطس الصغيرة ثم حمّريها بالزبدة والأعشاب.",
      "اشوي الأسباراجوس سريعًا وقدميه بجانب السلمون.",
    ],
    tools: [TOOLS.grill, TOOLS.nonstick, TOOLS.pot],
  },
  "r-risotto": {
    nutrition: { protein: 18, carbs: 72, fat: 22, fiber: 3 },
    prepTime: 10, difficulty: "متقدم",
    videoUrl: "https://www.youtube.com/embed/q5dQVb3qQ4M",
    steps: [
      "حمّري الكراث والثوم في الزبدة.",
      "أضيفي الأرز وحرّكي دقيقتين ثم اسكبي النبيذ.",
      "أضيفي مرق الخضار تدريجيًا مع التحريك المستمر.",
      "أضيفي الفطر والبارميزان في النهاية وقدميه ساخنًا.",
    ],
    tools: [TOOLS.pot, TOOLS.measuring, TOOLS.whisk],
  },
  "r-beef": {
    nutrition: { protein: 48, carbs: 32, fat: 38, fiber: 4 },
    prepTime: 15, difficulty: "متقدم",
    videoUrl: "https://www.youtube.com/embed/AmC9SmCBUj4",
    steps: [
      "أخرجي الستيك من الثلاجة قبل ٣٠ دقيقة من الطهي.",
      "تبّليه بالملح البحري والفلفل وادهنيه بالزيت.",
      "اشوي الستيك على نار عالية ٣–٤ دقائق لكل جانب.",
      "اتركيه يرتاح ٥ دقائق ثم قدميه مع الخضار وصلصة الفلفل.",
    ],
    tools: [TOOLS.grill, TOOLS.knife, TOOLS.board, TOOLS.ovenTray],
  },
};

const ESSENTIAL_INGREDIENT_IDS: Record<string, string[]> = {
  "r-eggs":    ["i1", "i4"],
  "r-cereal":  ["i1", "i2"],
  "r-bread":   ["i1", "i3"],
  "r-chicken": ["i1", "i2"],
  "r-pasta":   ["i1", "i3"],
  "r-bowl":    ["i1", "i2"],
  "r-salmon":  ["i1"],
  "r-risotto": ["i1", "i2"],
  "r-beef":    ["i1"],
};

export const MARKETING: Record<string, Marketing> = {
  "r-eggs":    { soldToday: 47, remaining: 12, badge: "الأكثر طلبًا" },
  "r-cereal":  { soldToday: 22, remaining: 18, badge: "صحي" },
  "r-bread":   { oldPrice: 70, soldToday: 31, remaining: 9, badge: "وفّر" },
  "r-chicken": { soldToday: 88, remaining: 14, badge: "الأكثر طلبًا" },
  "r-pasta":   { oldPrice: 110, soldToday: 54, remaining: 7, badge: "وفّر" },
  "r-bowl":    { soldToday: 36, remaining: 21, badge: "توصية الشيف" },
  "r-salmon":  { soldToday: 19, remaining: 6, badge: "توصية الشيف" },
  "r-risotto": { oldPrice: 210, soldToday: 25, remaining: 8, badge: "وفّر" },
  "r-beef":    { soldToday: 14, remaining: 4, badge: "جديد" },
};

export const RECIPES: Recipe[] = [
  { id: "r-eggs", name: "أومليت بالخضار والجبنة", section: "إفطار", category: "سريع",
    image: pEggs, basePrice: 65, baseServings: 1, cookTime: 10, calories: 320,
    ingredients: [
      { id: "i1", name: "بيض بلدي (3 حبات)", cost: 18 }, { id: "i2", name: "جبنة بيضاء", cost: 15 },
      { id: "i3", name: "خضار طازج", cost: 12 }, { id: "i4", name: "زيت زيتون", cost: 8 },
      { id: "i5", name: "ملح وفلفل", cost: 4 }, { id: "i6", name: "أعشاب طازجة", cost: 8 },
    ] },
  { id: "r-cereal", name: "بول الجرانولا بالفواكه والعسل", section: "إفطار", category: "صحي",
    image: pCereal, basePrice: 75, baseServings: 1, cookTime: 5, calories: 380,
    ingredients: [
      { id: "i1", name: "جرانولا بالتوت", cost: 22 }, { id: "i2", name: "زبادي يوناني", cost: 18 },
      { id: "i3", name: "فواكه موسمية", cost: 16 }, { id: "i4", name: "عسل أبيض", cost: 12 },
      { id: "i5", name: "مكسرات", cost: 7 },
    ] },
  { id: "r-bread", name: "ساندوتش حلوم بالأفوكادو", section: "إفطار", category: "نباتي",
    image: pBread, basePrice: 55, baseServings: 1, cookTime: 8, calories: 410,
    ingredients: [
      { id: "i1", name: "خبز ساوردو", cost: 15 }, { id: "i2", name: "جبنة حلوم", cost: 18 },
      { id: "i3", name: "أفوكادو ناضج", cost: 14 }, { id: "i4", name: "طماطم", cost: 4 },
      { id: "i5", name: "زيت زيتون وليمون", cost: 4 },
    ] },
  { id: "r-chicken", name: "دجاج مشوي بالأعشاب", section: "غداء", category: "عائلي",
    image: pChicken, basePrice: 145, baseServings: 2, cookTime: 35, calories: 520,
    ingredients: [
      { id: "i1", name: "صدور دجاج بلدي (500غ)", cost: 65 }, { id: "i2", name: "أرز بسمتي", cost: 22 },
      { id: "i3", name: "خضار مشكل", cost: 18 }, { id: "i4", name: "زيت زيتون وأعشاب", cost: 14 },
      { id: "i5", name: "ثوم وليمون", cost: 8 }, { id: "i6", name: "بهارات الشيف", cost: 10 },
      { id: "i7", name: "صلصة جانبية", cost: 8 },
    ] },
  { id: "r-pasta", name: "باستا كريمي بالفطر", section: "غداء", category: "سريع",
    image: pPasta, basePrice: 95, baseServings: 2, cookTime: 20, calories: 580,
    ingredients: [
      { id: "i1", name: "باستا إيطالية", cost: 18 }, { id: "i2", name: "فطر بورتوبيلو", cost: 22 },
      { id: "i3", name: "كريمة طبخ", cost: 14 }, { id: "i4", name: "جبنة بارميزان", cost: 22 },
      { id: "i5", name: "ثوم وأعشاب", cost: 9 }, { id: "i6", name: "زيت زيتون", cost: 10 },
    ] },
  { id: "r-bowl", name: "بول البحر المتوسط", section: "غداء", category: "صحي",
    image: pBowl, basePrice: 95, baseServings: 1, cookTime: 15, calories: 420,
    ingredients: [
      { id: "i1", name: "كينوا مطبوخة", cost: 18 }, { id: "i2", name: "حمص محمص", cost: 14 },
      { id: "i3", name: "خضار مشوي", cost: 18 }, { id: "i4", name: "تتبيلة طحينة", cost: 16 },
      { id: "i5", name: "أوراق خضراء", cost: 12 }, { id: "i6", name: "حبة بركة وسمسم", cost: 6 },
      { id: "i7", name: "جبنة فيتا", cost: 11 },
    ] },
  { id: "r-salmon", name: "سلمون مشوي بالليمون", section: "عشاء", category: "صحي",
    image: pSalmon, basePrice: 220, baseServings: 1, cookTime: 25, calories: 480,
    ingredients: [
      { id: "i1", name: "فيليه سلمون نرويجي (250غ)", cost: 120 }, { id: "i2", name: "أسباراجوس طازج", cost: 28 },
      { id: "i3", name: "زيت زيتون وليمون", cost: 18 }, { id: "i4", name: "بطاطس صغيرة", cost: 22 },
      { id: "i5", name: "أعشاب وثوم", cost: 12 }, { id: "i6", name: "ملح بحري", cost: 8 },
      { id: "i7", name: "صلصة الزبدة بالأعشاب", cost: 12 },
    ] },
  { id: "r-risotto", name: "ريزوتو الفطر بالبارميزان", section: "عشاء", category: "نباتي",
    image: pRisotto, basePrice: 180, baseServings: 2, cookTime: 30, calories: 620,
    ingredients: [
      { id: "i1", name: "أرز أربوريو", cost: 28 }, { id: "i2", name: "فطر مشكل", cost: 38 },
      { id: "i3", name: "بارميزان مبشور", cost: 32 }, { id: "i4", name: "زبدة طازجة", cost: 18 },
      { id: "i5", name: "مرق خضار", cost: 14 }, { id: "i6", name: "كراث وثوم", cost: 14 },
      { id: "i7", name: "نبيذ أبيض للطبخ", cost: 36 },
    ] },
  { id: "r-beef", name: "ستيك بقري مع خضار مشوي", section: "عشاء", category: "عائلي",
    image: pBeef, basePrice: 280, baseServings: 2, cookTime: 25, calories: 720,
    ingredients: [
      { id: "i1", name: "ستيك بقري ممتاز (400غ)", cost: 165 }, { id: "i2", name: "بطاطس باربية", cost: 22 },
      { id: "i3", name: "خضار مشوي", cost: 28 }, { id: "i4", name: "زبدة الأعشاب", cost: 22 },
      { id: "i5", name: "صلصة فلفل أسود", cost: 24 }, { id: "i6", name: "ثوم محمر", cost: 10 },
      { id: "i7", name: "ملح بحري", cost: 9 },
    ] },
];

// Apply essential flags once at module load.
RECIPES.forEach((r) => {
  const ess = ESSENTIAL_INGREDIENT_IDS[r.id] ?? [];
  r.ingredients = r.ingredients.map((i) => ({ ...i, essential: ess.includes(i.id) }));
});

export const SECTIONS: RecipeSection[] = ["إفطار", "غداء", "عشاء"];
export const FILTERS = ["كل الوصفات", "سريعة", "عائلية", "للأطفال", "صحية", "نباتية"];
export const DAYS = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

export const MEAL_WINDOWS: Record<RecipeSection, { startH: number; endH: number; icon: LucideIcon; label: string }> = {
  "إفطار": { startH: 6,  endH: 11, icon: Sun,    label: "٦ ص – ١١ ص" },
  "غداء":  { startH: 12, endH: 17, icon: Sunset, label: "١٢ ظ – ٥ م" },
  "عشاء":  { startH: 18, endH: 23, icon: Moon,   label: "٦ م – ١١ م" },
};

export function getMealForHour(h: number): RecipeSection {
  if (h >= 6 && h < 12) return "إفطار";
  if (h >= 12 && h < 18) return "غداء";
  return "عشاء";
}

export function isMealOpenNow(s: RecipeSection, d: Date): boolean {
  const w = MEAL_WINDOWS[s];
  const h = d.getHours();
  return h >= w.startH && h < w.endH;
}

export function minutesUntilClose(s: RecipeSection, d: Date): number {
  const w = MEAL_WINDOWS[s];
  if (!isMealOpenNow(s, d)) return 0;
  return (w.endH - d.getHours()) * 60 - d.getMinutes();
}
