/**
 * Search Foundation — pluggable provider registry.
 *
 * UI لا تعرف من ينفّذ البحث. provider واحد افتراضي (search feed) ومستقبلًا
 * يمكن إضافة Postgres FTS أو semantic vector بدون تغيير المستهلكين.
 */
import type { ProductCardVM } from "@/core/catalog/types";

export interface SearchFilter {
  /** مفتاح القدرة المسؤولة عن هذا الفلتر — null = فلتر عام. */
  capabilityKey: string | null;
  key: string;
  label: { ar: string; en?: string };
  /** نوع الإدخال: select | range | toggle | text */
  kind: string;
  /** قيم مقترحة (للـ select/toggle). */
  options?: { value: string; label: { ar: string; en?: string } }[];
}

export interface SearchQuery {
  q: string;
  sectionSlug?: string;
  filters?: Record<string, string | number | boolean>;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  items: ProductCardVM[];
  total: number;
  facets: Record<string, Record<string, number>>;
}

export interface SearchProvider {
  key: string;
  search(q: SearchQuery): Promise<SearchResult>;
  filtersFor(capabilities: readonly string[]): SearchFilter[];
}

class SearchRegistryClass {
  private providers = new Map<string, SearchProvider>();
  private defaultKey: string | null = null;
  register(p: SearchProvider, isDefault = false) {
    this.providers.set(p.key, p);
    if (isDefault || !this.defaultKey) this.defaultKey = p.key;
  }
  get(key?: string): SearchProvider {
    const k = key ?? this.defaultKey;
    if (!k) throw new Error("no search provider registered");
    const p = this.providers.get(k);
    if (!p) throw new Error(`search provider not found: ${k}`);
    return p;
  }
}

export const searchRegistry = new SearchRegistryClass();
