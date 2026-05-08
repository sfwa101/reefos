/**
 * BestSellersRail — horizontal carousel of curated bestsellers.
 */
import { Crown } from "lucide-react";

import { ProductCard } from "./ProductCard";
import { RailHeader } from "./RailHeader";
import type { HGProduct } from "../types";

export const BestSellersRail = ({
  items,
  hue,
  onOpen,
  title,
  sub,
}: {
  items: HGProduct[];
  hue: string;
  onOpen: (id: string) => void;
  title?: string;
  sub?: string;
}) => (
  <section className="mt-6 px-4">
    <RailHeader
      icon={Crown}
      title={title || "الأكثر طلباً"}
      sub={sub || "اختيارات موثوقة من العملاء"}
      hue={hue}
    />
    <div className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((p) => (
        <div key={p.id} className="w-[210px] shrink-0">
          <ProductCard p={p} onOpen={() => onOpen(p.id)} />
        </div>
      ))}
    </div>
  </section>
);
