/**
 * Shared types for the capability-driven card templates.
 *
 * All template components implement `CardTemplateProps` so the
 * SmartProductCard switch can dispatch them uniformly.
 */
import type { ProductCardVM } from "@/core/catalog/types";

export interface CardTemplateProps {
  vm: ProductCardVM;
  onOpen: () => void;
  onAddToCart: (id: string) => void;
}

/** Pick the localized string from an I18nText, defaulting to ar. */
export function pickName(
  text: { ar: string; en?: string } | undefined,
  locale: "ar" | "en" = "ar",
): string {
  if (!text) return "";
  return locale === "en" ? text.en ?? text.ar : text.ar;
}
