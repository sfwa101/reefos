import { memo, type ReactNode } from "react";
import BackHeader from "@/components/BackHeader";
import BuyItAgainRail from "@/components/store/BuyItAgainRail";
import VolumeDealsRail from "@/components/store/VolumeDealsRail";
import type { Product } from "@/lib/products";

interface SupermarketHeroProps {
  readonly title: string;
  readonly subtitle: string;
  readonly pool: ReadonlyArray<Product>;
  readonly searchSlot: ReactNode;
}

const SupermarketHeroImpl = ({
  title,
  subtitle,
  pool,
  searchSlot,
}: SupermarketHeroProps) => {
  // Cast once for the legacy rails which still accept a mutable array.
  const railPool = pool as Product[];
  return (
    <>
      <BackHeader
        title={title}
        subtitle={subtitle}
        accent="متجر"
        themeKey="supermarket"
      />
      {searchSlot}
      <BuyItAgainRail pool={railPool} />
      <VolumeDealsRail pool={railPool} />
    </>
  );
};

export const SupermarketHero = memo(SupermarketHeroImpl);
SupermarketHero.displayName = "SupermarketHero";
