import { catalogGateway } from "@/core/catalog/gateway";
import type { FeedSource } from "../types";

/**
 * Home feed — يجمع منتجات شائعة من القسم الرئيسي (slug من params، افتراضه home-goods).
 * لا hardcoded للأقسام — يقبل أي slug.
 */
export const homeFeed: FeedSource = async (d) => {
  const slug = String(d.params.slug ?? "home-goods");
  const r = await catalogGateway.listSection({
    slug,
    sort: "popularity",
    limit: d.limit ?? 24,
    offset: d.offset ?? 0,
  });
  return { items: r.items, hasMore: r.hasMore, nextOffset: r.nextOffset };
};
