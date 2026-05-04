/**
 * Meat catalog types — shared across the meat module.
 * Keep these light; pricing types live in `@/core/engine/pricing`.
 */

export type SubKey = string;

export interface MeatSubGroup {
  readonly id: SubKey;
  readonly label: string;
}

export interface MeatMainGroup {
  readonly id: string;
  readonly name: string;
  /** which product.subCategory values fall into this group */
  readonly subs: ReadonlyArray<MeatSubGroup>;
}

/** Sticky-nav layout offsets — exported so sub-components share the same math. */
export const NAV_OFFSETS = {
  HEADER_OFFSET: 56,
  TIER1: 52,
  TIER2: 44,
  TRIGGER: 14,
} as const;
