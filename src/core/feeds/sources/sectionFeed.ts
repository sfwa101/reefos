import { catalogGateway } from "@/core/catalog/gateway";
import type { FeedSource } from "../types";

export const sectionFeed: FeedSource = async (d) => {
  const slug = String(d.params.slug ?? "");
  const sort = (d.params.sort as "popularity" | "new" | "price_asc" | "price_desc" | "seasonal" | undefined) ?? "popularity";
  const r = await catalogGateway.listSection({
    slug,
    sort,
    limit: d.limit,
    offset: d.offset,
  });
  return { items: r.items, hasMore: r.hasMore, nextOffset: r.nextOffset };
};
