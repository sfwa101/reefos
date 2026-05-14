/**
 * Capability Registry — مفاتيح القدرات المعروفة + metadata.
 *
 * المصدر الحقيقي = جدول capability_registry في DB. هذا الكلاس يخزّنها in-memory
 * بعد hydrate أولي. لا توجد enums هنا — فقط constants للمفاتيح المستخدمة في
 * الكود الـ TS لتفادي typos. القائمة الفعلية تأتي من DB في runtime.
 */

/** مفاتيح ثوابت لاستخدامها في كود TS (typo-safe). DB قد يحتوي المزيد. */
export const CAP = Object.freeze({
  NUTRITION: "supports_nutrition",
  VARIANTS: "supports_variants",
  ADDONS: "supports_addons",
  WHOLESALE: "supports_wholesale",
  COLD_SHIPPING: "supports_cold_shipping",
  FAMILY_MODE: "supports_family_mode",
  QUICK_BUY: "supports_quick_buy",
  MEAL_MODE: "supports_meal_mode",
  SUBSCRIPTION: "supports_subscription",
  HEALTH_FILTERS: "supports_health_filters",
  SEASONAL: "supports_seasonal",
  B2B_PRICING: "supports_b2b_pricing",
  /** Phase D-1 — Economic Packaging Runtime (recursive unit hierarchy). */
  PACKAGING_HIERARCHY: "packaging_hierarchy",
  /** Phase D-1/D-2 — Multi-axis tag/graph classification. */
  MULTI_CLASSIFICATION: "multi_classification",
  /** Phase 1 W1 — POS routes order tickets to a Kitchen Display System. */
  SUPPORTS_KITCHEN_MODE: "supports_kitchen_mode",
  /** Phase 1 W1 — POS prioritizes barcode scanning workflow. */
  SUPPORTS_BARCODE_SCANNING: "supports_barcode_scanning",
  /** Phase 1 W1 — POS exposes one-tap quick-buy tiles. */
  SUPPORTS_QUICK_BUY: "supports_quick_buy",
} as const);

export type CapabilityKey = (typeof CAP)[keyof typeof CAP] | string;

export interface CapabilityDescriptor {
  key: string;
  /** فئة منطقية: pricing | logistics | content | filters | mode | ... */
  category: string;
  /** هل يتطلب جدولاً مساعداً (nutrition/variants/...). */
  requiresAux: boolean;
  metadata: Readonly<Record<string, unknown>>;
}

class CapabilityRegistryClass {
  private byKey = new Map<string, CapabilityDescriptor>();

  hydrate(items: readonly CapabilityDescriptor[]): void {
    this.byKey.clear();
    for (const c of items) this.byKey.set(c.key, c);
  }

  get(key: string): CapabilityDescriptor | undefined {
    return this.byKey.get(key);
  }

  has(key: string): boolean {
    return this.byKey.has(key);
  }

  all(): CapabilityDescriptor[] {
    return Array.from(this.byKey.values());
  }

  byCategory(category: string): CapabilityDescriptor[] {
    return this.all().filter((c) => c.category === category);
  }
}

export const capabilityRegistry = new CapabilityRegistryClass();
