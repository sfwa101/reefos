import type { LucideIcon } from "lucide-react";

export type CatId =
  | "all"
  | "vitamins"
  | "rx"
  | "personal"
  | "diabetes"
  | "firstaid"
  | "baby";

export type RxProduct = {
  id: string;
  name: string;
  brand: string;
  unit: string;
  price: number;
  oldPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  category: CatId;
  tagline: string;
  badges: string[];
  dosage: string;
  inStock: boolean;
};

export type Category = { id: CatId; name: string; icon: LucideIcon };

export type SmartItem = { id: string; label: string; icon: LucideIcon; hue: string };
