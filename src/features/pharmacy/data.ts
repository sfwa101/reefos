import {
  Sparkle,
  Leaf,
  Pill,
  HeartPulse,
  Activity,
  ShieldPlus,
  Baby,
} from "lucide-react";
import rxVitD from "@/assets/rx-vitd.jpg";
import rxOmega from "@/assets/rx-omega.jpg";
import rxGlucose from "@/assets/rx-glucose.jpg";
import rxFirstAid from "@/assets/rx-firstaid.jpg";
import rxSerum from "@/assets/rx-serum.jpg";
import rxBp from "@/assets/rx-bp.jpg";
import pMedicine from "@/assets/p-medicine.jpg";
import pDiapers from "@/assets/p-diapers.jpg";
import type { Category, RxProduct } from "./types";

export const categories: Category[] = [
  { id: "all", name: "الكل", icon: Sparkle },
  { id: "vitamins", name: "فيتامينات ومكملات", icon: Leaf },
  { id: "rx", name: "أدوية موصوفة", icon: Pill },
  { id: "personal", name: "عناية شخصية متقدمة", icon: HeartPulse },
  { id: "diabetes", name: "عناية مرضى السكري", icon: Activity },
  { id: "firstaid", name: "الإسعافات الأولية", icon: ShieldPlus },
  { id: "baby", name: "عناية الأطفال", icon: Baby },
];

export const RX: RxProduct[] = [
  { id: "vit-d3", name: "فيتامين د3 5000 وحدة", brand: "ناتشورال", unit: "60 كبسولة", price: 185, oldPrice: 220, image: rxVitD, rating: 4.8, reviews: 312, category: "vitamins", tagline: "لمناعة قوية وعظام سليمة", badges: ["خالٍ من الجلوتين", "غير معدّل وراثياً", "نباتي"], dosage: "كبسولة واحدة يومياً مع الطعام", inStock: true },
  { id: "omega3", name: "أوميجا 3 عالي التركيز", brand: "نوردك بيور", unit: "90 كبسولة · 1000mg", price: 295, image: rxOmega, rating: 4.9, reviews: 421, category: "vitamins", tagline: "لصحة القلب والدماغ", badges: ["نقي طبياً", "بدون رائحة", "مُختبر معملياً"], dosage: "كبسولتان يومياً مع الوجبات", inStock: true },
  { id: "para", name: "باراسيتامول 500mg", brand: "أبيمول", unit: "20 قرص", price: 22, image: pMedicine, rating: 4.6, reviews: 98, category: "rx", tagline: "مسكن وخافض للحرارة", badges: ["لا يحتاج وصفة", "آمن للحامل بإشراف"], dosage: "قرص كل 6 ساعات عند الحاجة", inStock: true },
  { id: "amox", name: "أموكسيسيلين 500mg", brand: "ميديك", unit: "21 كبسولة", price: 65, image: pMedicine, rating: 4.5, reviews: 54, category: "rx", tagline: "مضاد حيوي واسع الطيف", badges: ["يحتاج وصفة طبية"], dosage: "كبسولة كل 8 ساعات", inStock: true },
  { id: "serum", name: "سيروم حمض الهيالورونيك", brand: "ديرما لوكس", unit: "30ml", price: 340, oldPrice: 420, image: rxSerum, rating: 4.9, reviews: 256, category: "personal", tagline: "ترطيب عميق ومكافحة الشيخوخة", badges: ["ديرماتولوجياً مختبر", "خالٍ من البارابين"], dosage: "قطرتان صباحاً ومساءً", inStock: true },
  { id: "glucose", name: "جهاز قياس السكر الذكي", brand: "أكيوريت", unit: "جهاز + 50 شريحة", price: 890, image: rxGlucose, rating: 4.7, reviews: 128, category: "diabetes", tagline: "نتائج دقيقة في 5 ثوانٍ", badges: ["متصل بالموبايل", "ضمان سنتين"], dosage: "كما يحدده طبيبك", inStock: true },
  { id: "firstaid", name: "حقيبة إسعافات أولية شاملة", brand: "ميد سيف", unit: "32 قطعة", price: 245, image: rxFirstAid, rating: 4.8, reviews: 89, category: "firstaid", tagline: "كل ما تحتاجه للطوارئ المنزلية", badges: ["معتمدة طبياً", "محمولة"], dosage: "—", inStock: true },
  { id: "bp", name: "جهاز قياس ضغط الدم", brand: "أوميرون", unit: "ذراع رقمي", price: 1250, oldPrice: 1450, image: rxBp, rating: 4.9, reviews: 201, category: "personal", tagline: "قياسات دقيقة في المنزل", badges: ["شاشة كبيرة", "ذاكرة 60 قراءة"], dosage: "قراءتان يومياً", inStock: true },
  { id: "diapers", name: "حفاضات الأطفال الفاخرة", brand: "بامبو", unit: "مقاس 4 · 60 حبة", price: 215, image: pDiapers, rating: 4.7, reviews: 312, category: "baby", tagline: "جلد طفلك يستحق الأفضل", badges: ["ناعم على البشرة", "امتصاص 12 ساعة"], dosage: "—", inStock: true },
];

export const idToLabel = (id: string) =>
  ({
    "ai-symptoms": "تحليل الأعراض",
    "ai-schedule": "جدول الأدوية",
    "ai-consult": "استشارة الصيدلي",
    "ai-scan": "ماسح الأدوية",
  })[id] ?? id;
