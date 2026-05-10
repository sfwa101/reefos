import { sectionFeed } from "./sectionFeed";
import type { FeedSource } from "../types";

/**
 * Search feed — placeholder حتى ينضج SearchRegistry. حاليًا يرجع قائمة قسم
 * مفلترة بالاسم (جانب-عميل، آمن مؤقتاً). الانتقال لـ provider حقيقي لاحقاً
 * يحدث دون لمس أي UI.
 */
export const searchFeed: FeedSource = async (d) => {
  const q = String(d.params.q ?? "").trim().toLowerCase();
  const r = await sectionFeed(d);
  if (!q) return r;
  return {
    ...r,
    items: r.items.filter(
      (p) =>
        p.name.ar.toLowerCase().includes(q) ||
        (p.name.en?.toLowerCase().includes(q) ?? false) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    ),
  };
};
