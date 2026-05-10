/**
 * Feed Runtime types — وصف موحّد لأي feed منتجات.
 * مصدر البيانات (home/section/offers/...) يُحدَّد بـ kind فقط — لا فروع لكل قسم.
 */
import type { ProductCardVM } from "@/core/catalog/types";

export type FeedKind =
  | "home"
  | "section"
  | "offers"
  | "recommendations"
  | "trending"
  | "search";

export interface FeedDescriptor {
  kind: FeedKind;
  /** بارامترات حرة — كل source يفسّرها. */
  params: Readonly<Record<string, string | number | boolean | undefined>>;
  limit?: number;
  offset?: number;
}

export interface FeedResult {
  items: ProductCardVM[];
  hasMore: boolean;
  nextOffset?: number;
}

export type FeedSource = (descriptor: FeedDescriptor) => Promise<FeedResult>;
