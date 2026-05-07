// Static palette + product helpers for the SchoolLibrary hub.
// Extracted from src/pages/store/SchoolLibrary.tsx during decomposition.

import { products as allProducts } from "@/lib/products";

// Royal blue palette specific to this hub
export const PALETTE = {
  primary: "#1B5E8C",
  primarySoft: "#E6F1FA",
  ink: "#0F3A5C",
  accent: "#2EA8E6",
} as const;

export const libraryProducts = () =>
  allProducts.filter((p) => p.source === "library");

export type TabKey = "store" | "borrow" | "print";
