/**
 * Universal Modifier Engine — Schema Types
 * ----------------------------------------
 * A composable, JSON-describable contract for product modifiers.
 * Used by Sweets, Meat, Restaurants, and any future vertical.
 * Designed to be SDUI-serializable so the System Editor can attach
 * modifier groups to ANY product across the Salsabil OS family.
 */

export type ModifierOptionSchema = {
  id: string;
  label: string;
  /** Absolute price delta (EGP). Positive = surcharge, 0 = free. */
  price?: number;
  /** Optional secondary hint (e.g. "مجاني", "+30 د") */
  hint?: string;
  /** Disable interaction (prep dependency, out of stock, …). */
  disabled?: boolean;
};

export type SelectionGroupSchema = {
  kind: "selection";
  id: string;
  title: string;
  /** "single" → radio (one of), "multi" → checkbox (any of). */
  mode: "single" | "multi";
  /** Visual layout — defaults to "list". */
  layout?: "list" | "grid";
  required?: boolean;
  /** Optional emoji/icon char rendered next to title. */
  icon?: string;
  /** Optional accent color token (defaults to primary). */
  accent?: "rose" | "violet" | "emerald" | "amber" | "primary";
  options: ModifierOptionSchema[];
};

export type TextInputGroupSchema = {
  kind: "text";
  id: string;
  title: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  required?: boolean;
  icon?: string;
  accent?: "rose" | "violet" | "emerald" | "amber" | "primary";
};

export type QuantityGroupSchema = {
  kind: "quantity";
  id: string;
  title: string;
  min?: number;
  max?: number;
  step?: number;
  accent?: "rose" | "violet" | "emerald" | "amber" | "primary";
};

export type ModifierGroupSchema =
  | SelectionGroupSchema
  | TextInputGroupSchema
  | QuantityGroupSchema;

/** Map of group.id → user selection. */
export type ModifierState = Record<
  string,
  string | string[] | number
>;

/** Accent → tailwind color tokens. */
export const ACCENTS: Record<
  NonNullable<SelectionGroupSchema["accent"]>,
  { ring: string; bg: string; text: string; dot: string }
> = {
  primary: { ring: "border-primary", bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  rose: { ring: "border-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-700 dark:text-rose-300", dot: "bg-rose-500" },
  violet: { ring: "border-violet-500", bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  emerald: { ring: "border-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  amber: { ring: "border-amber-500", bg: "bg-amber-50 dark:bg-amber-500/10", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
};
