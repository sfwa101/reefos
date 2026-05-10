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
  const attrs = isObj(row.metadata) ? row.metadata : {};
  const identity = isObj(attrs.identity) ? attrs.identity : {};
  // Resolver يقبل شكلين: nested (metadata.identity.*) أو flat (metadata.*).
  // كلاهما صالح من DB — لا hardcoded per slug.
  const pick = (k: string, fb: string) =>
    str(identity[k], str(attrs[k], fb));
  return {
    id: row.id,
    slug: row.slug,
    name: toI18n(row.name_i18n, row.slug),
    parentId: row.parent_id ?? undefined,
    sortOrder: row.sort_order,
    visualTone: pick("visualTone", str(attrs.tone, "neutral")),
    cardStyle: pick("cardStyle", "compact"),
    interactionPattern: pick("interactionPattern", "tap_buy"),
    sortStrategy: pick("sortStrategy", "popularity"),
    recommendationStrategy: pick("recommendationStrategy", "similar"),
    searchBehavior: pick("searchBehavior", "keyword"),
    badgeAllowlist: stringArray(identity.badgeAllowlist ?? attrs.badgeAllowlist),
    capabilities,
    attributes: Object.freeze({ ...attrs }),
  };
}
