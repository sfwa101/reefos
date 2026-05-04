export interface RestoProduct {
  readonly id: string;
  readonly name: string;
  readonly brand: string | null;
  readonly price: number;
  readonly image: string | null;
  readonly rating: number | null;
  readonly source: string | null;
  readonly fulfillment_type: string | null;
  readonly description: string | null;
  readonly metadata: Record<string, unknown> | null;
}

export const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80&auto=format&fit=crop";

export const getPrep = (m: RestoProduct["metadata"]): number | null => {
  if (!m || typeof m !== "object") return null;
  const v = (m as Record<string, unknown>).prepTime;
  return typeof v === "number" ? v : null;
};

export const slug = (s: string): string =>
  "rest-" + s.replace(/\s+/g, "-").toLowerCase().slice(0, 40);
