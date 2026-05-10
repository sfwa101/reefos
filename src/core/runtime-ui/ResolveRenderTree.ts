/**
 * Render Tree Resolver — section + capabilities → RenderDescriptor.
 *
 * منطق نقي: يبني شجرة بلوكات حسب القسم والقدرات. لا React هنا.
 * يستخدمه RuntimeRenderer + اختبارات unit.
 */
import type { SectionIdentity } from "@/core/sections/types";
import type { ProductCardVM, ProductDetailsVM } from "@/core/catalog/types";
import { CAP } from "@/core/capabilities";
import type { RenderBlock, RenderDescriptor } from "./types";

export type ViewMode = "list" | "details";

const block = (kind: string, id: string, props?: Record<string, unknown>): RenderBlock =>
  ({ kind, id, props });

/** قائمة منتجات قسم. */
export function resolveListTree(
  section: SectionIdentity,
  items: readonly ProductCardVM[],
): RenderDescriptor {
  const blocks: RenderBlock[] = [
    block("section.header", "header", {
      tone: section.visualTone,
      title: section.name,
      cardStyle: section.cardStyle,
    }),
    block("product.grid", "grid", {
      cardStyle: section.cardStyle,
      items,
      capabilities: section.capabilities,
    }),
  ];

  if (section.capabilities.includes(CAP.QUICK_BUY)) {
    blocks.push(block("commerce.quick_buy_bar", "quick-buy"));
  }

  return {
    context: { sectionSlug: section.slug, view: "list" },
    blocks,
  };
}

/** صفحة تفاصيل منتج. القدرات تتحكم بالبلوكات الظاهرة. */
export function resolveDetailsTree(
  section: SectionIdentity,
  product: ProductDetailsVM,
): RenderDescriptor {
  const caps = product.capabilities;
  const blocks: RenderBlock[] = [
    block("product.gallery", "gallery", { hero: product.hero, gallery: product.gallery }),
    block("product.heading", "heading", { name: product.name, badges: product.badges }),
    block("product.price", "price", { price: product.price, saleUnit: product.saleUnit }),
  ];

  if (caps.has(CAP.VARIANTS) && product.variants.length) {
    blocks.push(block("product.variants", "variants", { variants: product.variants }));
  }
  if (caps.has(CAP.ADDONS) && product.addons.length) {
    blocks.push(block("product.addons", "addons", { addons: product.addons }));
  }
  if (product.description) {
    blocks.push(block("product.description", "description", { text: product.description }));
  }
  if (caps.has(CAP.NUTRITION) && product.nutrition) {
    blocks.push(block("product.nutrition", "nutrition", { nutrition: product.nutrition }));
  }
  if (caps.has(CAP.HEALTH_FILTERS) && product.nutrition) {
    blocks.push(block("product.diet_flags", "diet", {
      flags: product.nutrition.dietFlags,
      allergens: product.nutrition.allergens,
    }));
  }
  if (product.relations.length) {
    blocks.push(block("product.relations", "relations", {
      relations: product.relations,
      strategy: section.recommendationStrategy,
    }));
  }
  if (caps.has(CAP.SUBSCRIPTION)) {
    blocks.push(block("commerce.subscribe_cta", "subscribe"));
  } else {
    blocks.push(block("commerce.add_to_cart", "atc"));
  }

  return {
    context: { sectionSlug: section.slug, view: "details", productId: product.id },
    blocks,
  };
}
