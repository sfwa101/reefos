/**
 * BundlesRail — horizontal "bundles" carousel section.
 *
 * Wave P-A — consumes `ProductCardVM[]` directly.
 */
import { Package } from "lucide-react";

import type { ProductCardVM } from "@/core/catalog/types";

import { BUNDLES } from "../dictionaries";
import { BundleCard } from "./BundleCard";
import { RailHeader } from "./RailHeader";

export const BundlesRail = ({
  catalog,
  hue,
  title,
  sub,
}: {
  catalog: ProductCardVM[];
  hue: string;
  title?: string;
  sub?: string;
}) => (
  <section className="mt-5 px-4">
    <RailHeader
      icon={Package}
      title={title || "عروض وحزم التوفير"}
      sub={sub || "مجموعات مختارة بسعر أوفر"}
      hue={hue}
    />
    <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {BUNDLES.map((b) => {
        const items = b.itemIds
          .map((id) => catalog.find((p) => p.id === id))
          .filter((p): p is ProductCardVM => Boolean(p));
        if (items.length === 0) return null;
        return <BundleCard key={b.id} bundle={b} items={items} hue={hue} />;
      })}
    </div>
  </section>
);
