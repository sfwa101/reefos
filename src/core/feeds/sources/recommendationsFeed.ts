import { catalogGateway } from "@/core/catalog/gateway";
import { sectionFeed } from "./sectionFeed";
import type { FeedSource } from "../types";

/**
 * Recommendations feed — إذا تم تمرير productId، نستخدم relations؛
 * وإلا نعود إلى trending للقسم.
 */
export const recommendationsFeed: FeedSource = async (d) => {
  const productId = d.params.productId ? String(d.params.productId) : "";
  if (productId) {
    const relations = await catalogGateway.getRelations(productId, d.limit ?? 12);
    // resolve relations → cards via section list (lazy: relations جاهزة كـ ids؛ التوسعة الكاملة في Wave 2.D)
    return {
      items: relations.map((r) => ({
        // shell card حتى لا نُسرّب raw — UI يعرف أنها relation references
        id: r.relatedId,
        slug: r.relatedId,
        sectionId: "",
        sectionSlug: "",
        name: { ar: "" },
        price: { amount: 0, currency: "EGP" },
        saleUnit: "unit",
        inStock: true,
        isLowStock: false,
        badges: [],
        tags: [r.relationType],
        rating: { avg: 0, count: 0 },
        capabilities: [],
        attributes: { strength: r.strength },
      })),
      hasMore: false,
    };
  }
  return sectionFeed(d);
};
