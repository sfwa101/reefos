/**
 * Hybrid recommendations — يجمع علاقات يدوية + مشتقّة.
 *
 * المصادر:
 *   1. manual         — جدول product_relations (relation_type = 'manual').
 *   2. bought_together / complementary / seasonal / similar — أيضاً من DB.
 *   3. similarity by tags / nutrition (مشتقّة لاحقاً في Wave 2.C).
 *
 * يرجع قائمة مرتّبة بالـ strength.
 */
import type { ProductRelationVM } from "../types";

export type RelationType =
  | "manual"
  | "similar"
  | "bought_together"
  | "complementary"
  | "seasonal";

export interface ResolveRelationsInput {
  productId: string;
  /** علاقات مباشرة من DB. */
  stored: readonly ProductRelationVM[];
  /** فلترة اختيارية بأنواع علاقات معيّنة. */
  types?: readonly RelationType[];
  limit?: number;
}

export function resolveRelations(input: ResolveRelationsInput): ProductRelationVM[] {
  const wanted = input.types ? new Set(input.types as readonly string[]) : null;
  const filtered = wanted
    ? input.stored.filter((r) => wanted.has(r.relationType))
    : [...input.stored];

  // ترتيب: strength desc, ثم حسب نوع الأولوية (manual > complementary > bought_together > similar > seasonal)
  const typeRank: Record<string, number> = {
    manual: 5,
    complementary: 4,
    bought_together: 3,
    similar: 2,
    seasonal: 1,
  };
  filtered.sort((a, b) => {
    if (b.strength !== a.strength) return b.strength - a.strength;
    return (typeRank[b.relationType] ?? 0) - (typeRank[a.relationType] ?? 0);
  });

  return input.limit ? filtered.slice(0, input.limit) : filtered;
}
