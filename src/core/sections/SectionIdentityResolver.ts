/**
 * Resolver — DB row → SectionIdentity.
 * كل القيم تُقرأ من attributes jsonb مع defaults آمنة (لا hardcoded per slug).
 */
import type { Database } from "@/integrations/supabase/types";
import type { SectionIdentity } from "./types";

type SectionRow = Database["public"]["Tables"]["sections"]["Row"];

const str = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.length > 0 ? v : fallback;

const stringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const toI18n = (v: unknown, fallback: string) => {
  if (typeof v === "string") return { ar: v };
  if (isObj(v)) {
    const ar = typeof v.ar === "string" ? v.ar : fallback;
    const en = typeof v.en === "string" ? v.en : undefined;
    return en ? { ar, en } : { ar };
  }
  return { ar: fallback };
};

export function resolveSectionIdentity(
  row: SectionRow,
  capabilities: readonly string[],
): SectionIdentity {
  const attrs = isObj(row.attributes) ? row.attributes : {};
  const identity = isObj(attrs.identity) ? attrs.identity : {};
  return {
    id: row.id,
    slug: row.slug,
    name: toI18n(row.name_i18n, row.slug),
    parentId: row.parent_id ?? undefined,
    sortOrder: row.sort_order,
    visualTone: str(identity.visualTone, "neutral"),
    cardStyle: str(identity.cardStyle, "compact"),
    interactionPattern: str(identity.interactionPattern, "tap_buy"),
    sortStrategy: str(identity.sortStrategy, "popularity"),
    recommendationStrategy: str(identity.recommendationStrategy, "similar"),
    searchBehavior: str(identity.searchBehavior, "keyword"),
    badgeAllowlist: stringArray(identity.badgeAllowlist),
    capabilities,
    attributes: Object.freeze({ ...attrs }),
  };
}
