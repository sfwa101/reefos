/**
 * Feed Runtime — registry + resolver لجميع feeds.
 * الإضافة لاحقاً = source جديد يُسجَّل هنا. لا فروع داخل الـ UI.
 */
import type { FeedDescriptor, FeedKind, FeedResult, FeedSource } from "./types";
import { homeFeed } from "./sources/homeFeed";
import { sectionFeed } from "./sources/sectionFeed";
import { offersFeed } from "./sources/offersFeed";
import { trendingFeed } from "./sources/trendingFeed";
import { recommendationsFeed } from "./sources/recommendationsFeed";
import { searchFeed } from "./sources/searchFeed";

class FeedRegistry {
  private map = new Map<FeedKind, FeedSource>();
  register(kind: FeedKind, src: FeedSource) {
    this.map.set(kind, src);
  }
  resolve(kind: FeedKind): FeedSource | undefined {
    return this.map.get(kind);
  }
}

export const feedRegistry = new FeedRegistry();
feedRegistry.register("home", homeFeed);
feedRegistry.register("section", sectionFeed);
feedRegistry.register("offers", offersFeed);
feedRegistry.register("trending", trendingFeed);
feedRegistry.register("recommendations", recommendationsFeed);
feedRegistry.register("search", searchFeed);

export async function resolveFeed(d: FeedDescriptor): Promise<FeedResult> {
  const src = feedRegistry.resolve(d.kind);
  if (!src) throw new Error(`feed not registered: ${d.kind}`);
  return src(d);
}
