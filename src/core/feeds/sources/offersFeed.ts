import { catalogGateway } from "@/core/catalog/gateway";
import type { FeedSource } from "../types";

export const offersFeed: FeedSource = async (d) => {
  const slug = String(d.params.slug ?? "offers");
  const items = await catalogGateway.offers(slug, d.limit ?? 24);
  return { items, hasMore: false };
};
