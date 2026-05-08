/**
 * BundlesRail — horizontal "bundles" carousel section.
 *
 * Phase 11.2 — bundles still come from the local `dictionaries` (UI
 * config), but the products they reference are pulled from the live
 * Supabase catalog passed in as `catalog`.
 */
import { Package } from "lucide-react";

import { BUNDLES } from "../dictionaries";
import type { HGProduct } from "../types";
import { BundleCard } from "./BundleCard";
import { RailHeader } from "./RailHeader";

export const BundlesRail = ({
  catalog,
  hue,
}: {
  catalog: HGProduct[];
  hue: string;
}) => (
  <section className="mt-5 px-4">
    <RailHeader
      icon={Package}
      title="حزم موفّرة"
      sub="مجموعات مختارة بسعر أوفر عند الشراء معًا"
      hue={hue}
    />
    <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {BUNDLES.map((b) => {
        const items = b.itemIds
          .map((id) => catalog.find((p) => p.id === id))
          .filter((p): p is HGProduct => Boolean(p));
        if (items.length === 0) return null;
        return <BundleCard key={b.id} bundle={b} items={items} hue={hue} />;
      })}
    </div>
  </section>
);
