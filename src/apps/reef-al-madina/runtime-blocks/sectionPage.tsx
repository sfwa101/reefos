/**
 * Section page block wrappers — Wave P-C · Phase C-1.
 *
 * Six new block kinds that thinly wrap existing storefront UI components,
 * enabling `resolveSectionTree` to compose any vertical's page shell as a
 * declarative RenderDescriptor consumed by `RuntimeRenderer`.
 *
 * Zero visual diff: each block renders the same legacy component with the
 * same props the legacy page shells passed directly.
 */
import type { BlockComponent } from "@/core/runtime-ui/RuntimeRenderer";
import BackHeader from "@/components/BackHeader";
import { SectionHeroBanner } from "@/core/runtime-ui/sections/SectionHeroBanner";
import { LayoutFactory } from "@/apps/reef-al-madina/features/storefront/home/components/LayoutFactory";
import { FiltersSheet } from "@/apps/reef-al-madina/features/storefront/home/components/FiltersSheet";
import { DetailSheet } from "@/apps/reef-al-madina/features/storefront/home/components/DetailSheet";
import { CompareBar } from "@/apps/reef-al-madina/features/storefront/home/components/CompareBar";
import type { HomeOrchestrator } from "@/apps/reef-al-madina/features/storefront/home/hooks/useHomeOrchestrator";
import type { SectionIdentity } from "@/core/catalog/registry/SectionIdentityRegistry";
import type { StoreTheme } from "@/lib/storeThemes";
import type { ProductCardVM } from "@/core/catalog/types";

// ─── nav.back_header ───
export const BackHeaderBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { title: string; subtitle?: string };
  return <BackHeader title={props.title} subtitle={props.subtitle} />;
};

// ─── section.hero_banner ───
export const SectionHeroBannerBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as { identity: SectionIdentity };
  return <SectionHeroBanner identity={props.identity} />;
};

// ─── section.layout_factory ───
export const SectionLayoutFactoryBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as {
    pageKey: string;
    theme: StoreTheme;
    orchestrator?: HomeOrchestrator;
    identity?: SectionIdentity;
  };
  return (
    <LayoutFactory
      pageKey={props.pageKey}
      theme={props.theme}
      orchestrator={props.orchestrator}
      identity={props.identity}
    />
  );
};

// ─── section.filters_sheet ───
export const SectionFiltersSheetBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as {
    orchestrator: HomeOrchestrator;
    hue: string;
  };
  const o = props.orchestrator;
  return (
    <FiltersSheet
      sort={o.sort}
      setSort={o.setSort}
      priceMax={o.priceMax}
      setPriceMax={o.setPriceMax}
      priceMaxAvail={o.priceMaxAvail}
      fulFilter={o.fulFilter}
      setFulFilter={o.setFulFilter}
      onClose={() => o.setFiltersOpen(false)}
      onReset={o.resetAll}
      hue={props.hue}
    />
  );
};

// ─── product.detail_sheet ───
export const ProductDetailSheetBlock: BlockComponent = ({ block }) => {
  const props = (block.props ?? {}) as {
    product: ProductCardVM;
    onClose: () => void;
  };
  return <DetailSheet product={props.product} onClose={props.onClose} />;
};

// ─── commerce.compare_bar ───
export const CompareBarBlock: BlockComponent = () => <CompareBar />;
