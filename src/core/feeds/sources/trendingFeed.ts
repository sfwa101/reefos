import { catalogGateway } from "@/core/catalog/gateway";
import type { FeedSource } from "../types";

export const trendingFeed: FeedSource = async (d) => {
  const slug = String(d.params.slug ?? "home-goods");
  const items = await catalogGateway.trending(slug, d.limit ?? 12);
  return { items, hasMore: false };
};
