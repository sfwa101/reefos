/**
 * Section Registry — مخزن in-memory للهويات يُحقن من server function.
 * يُستهلك بشكل synchronous من resolvers/factories بعد hydrate أولي.
 */
import type { SectionIdentity } from "./types";

class SectionRegistryClass {
  private bySlug = new Map<string, SectionIdentity>();
  private byId = new Map<string, SectionIdentity>();

  hydrate(sections: readonly SectionIdentity[]): void {
    this.bySlug.clear();
    this.byId.clear();
    for (const s of sections) {
      this.bySlug.set(s.slug, s);
      this.byId.set(s.id, s);
    }
  }

  getBySlug(slug: string): SectionIdentity | undefined {
    return this.bySlug.get(slug);
  }

  getById(id: string): SectionIdentity | undefined {
    return this.byId.get(id);
  }

  all(): SectionIdentity[] {
    return Array.from(this.bySlug.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  isHydrated(): boolean {
    return this.bySlug.size > 0;
  }
}

export const sectionRegistry = new SectionRegistryClass();
