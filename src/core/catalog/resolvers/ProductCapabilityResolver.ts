/**
 * يحدّد قدرات المنتج عبر دمج:
 *   - capabilities المعرّفة على القسم (section_capabilities).
 *   - overrides من attributes الخاصة بالمنتج (e.g. attributes.disabled_capabilities).
 *
 * النتيجة: ReadonlySet<string> مرّرها للمكوّنات لتقرر أي بلوكات ترسم.
 */
import type { NormalizedProduct } from "../runtime/ProductTransformers";

export interface CapabilityResolverInput {
  product: NormalizedProduct;
  /** القدرات المفعّلة على القسم (من جدول section_capabilities). */
  sectionCapabilities: readonly string[];
}

export function resolveProductCapabilities(
  input: CapabilityResolverInput,
): ReadonlySet<string> {
  const enabled = new Set<string>(input.sectionCapabilities);
  const attrs = input.product.attributes;

  const additions = Array.isArray(attrs.added_capabilities)
    ? (attrs.added_capabilities as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const removals = Array.isArray(attrs.disabled_capabilities)
    ? (attrs.disabled_capabilities as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  for (const a of additions) enabled.add(a);
  for (const r of removals) enabled.delete(r);

  return enabled;
}
