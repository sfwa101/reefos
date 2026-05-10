/**
 * Section Adapters — نقطة امتداد لكل قسم لتعديل شكل/سلوك VM قبل التسليم للواجهة.
 *
 * الفلسفة: القسم لا يكتب React، يكتب Adapter يستقبل VM ويعيد VM (محتمل معدّل).
 * الـ resolver يختار الـ adapter حسب section.slug. Adapter افتراضي لا يفعل شيئاً.
 *
 * ملاحظة: لا adapters hardcoded هنا — مجرد سجل قابل للتسجيل في runtime.
 */
import type { ProductCardVM, ProductDetailsVM } from "../types";

export interface SectionAdapter {
  card?: (vm: ProductCardVM) => ProductCardVM;
  details?: (vm: ProductDetailsVM) => ProductDetailsVM;
}

const identityAdapter: SectionAdapter = {};

class SectionAdapterRegistry {
  private adapters = new Map<string, SectionAdapter>();

  register(sectionSlug: string, adapter: SectionAdapter): void {
    this.adapters.set(sectionSlug, adapter);
  }

  resolve(sectionSlug: string): SectionAdapter {
    return this.adapters.get(sectionSlug) ?? identityAdapter;
  }

  applyCard(sectionSlug: string, vm: ProductCardVM): ProductCardVM {
    const a = this.resolve(sectionSlug);
    return a.card ? a.card(vm) : vm;
  }

  applyDetails(sectionSlug: string, vm: ProductDetailsVM): ProductDetailsVM {
    const a = this.resolve(sectionSlug);
    return a.details ? a.details(vm) : vm;
  }
}

export const sectionAdapters = new SectionAdapterRegistry();
