/**
 * Default search provider — يستخدم Feed runtime (search feed).
 * يمكن استبداله بـ Postgres FTS أو Vector provider لاحقاً دون تغيير UI.
 */
import { resolveFeed } from "@/core/feeds";
import { CAP } from "@/core/capabilities";
import type { SearchFilter, SearchProvider, SearchQuery, SearchResult } from "./SearchRegistry";

const universalFilters: SearchFilter[] = [
  { capabilityKey: null, key: "in_stock", label: { ar: "متوفر فقط", en: "In stock" }, kind: "toggle" },
  { capabilityKey: null, key: "price_max", label: { ar: "السعر الأقصى", en: "Max price" }, kind: "range" },
];

const capabilityFilters: Record<string, SearchFilter[]> = {
  [CAP.HEALTH_FILTERS]: [
    { capabilityKey: CAP.HEALTH_FILTERS, key: "diet", label: { ar: "نظام غذائي" }, kind: "select" },
  ],
  [CAP.SEASONAL]: [
    { capabilityKey: CAP.SEASONAL, key: "seasonal_now", label: { ar: "الموسم الحالي" }, kind: "toggle" },
  ],
  [CAP.NUTRITION]: [
    { capabilityKey: CAP.NUTRITION, key: "low_calorie", label: { ar: "سعرات منخفضة" }, kind: "toggle" },
  ],
  [CAP.WHOLESALE]: [
    { capabilityKey: CAP.WHOLESALE, key: "min_qty", label: { ar: "حد أدنى للكمية" }, kind: "range" },
  ],
};

export const defaultSearchProvider: SearchProvider = {
  key: "feed-default",
  async search(q: SearchQuery): Promise<SearchResult> {
    const r = await resolveFeed({
      kind: "search",
      params: { slug: q.sectionSlug ?? "home-goods", q: q.q },
      limit: q.limit,
      offset: q.offset,
    });
    return { items: r.items, total: r.items.length, facets: {} };
  },
  filtersFor(capabilities) {
    const out = [...universalFilters];
    for (const cap of capabilities) {
      if (capabilityFilters[cap]) out.push(...capabilityFilters[cap]);
    }
    return out;
  },
};
