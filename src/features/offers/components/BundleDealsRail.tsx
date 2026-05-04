import { Package } from "lucide-react";

export type BundleDeal = {
  id: string;
  title: string;
  subtitle?: string;
  priceLabel?: string;
};

export type BundleDealsRailProps = {
  bundles: BundleDeal[];
  title?: string;
};

const BundleDealsRail = ({ bundles, title = "باقات التوفير" }: BundleDealsRailProps) => {
  if (bundles.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <Package className="h-4 w-4 text-amber-500" />
        <h3 className="font-display text-base font-extrabold">{title}</h3>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar snap-x">
        {bundles.map((b) => (
          <div
            key={b.id}
            className="w-[70%] shrink-0 snap-start rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 p-4 text-white shadow-tile"
          >
            <p className="text-[10px] font-bold opacity-90">{b.subtitle ?? "باقة موفّرة"}</p>
            <p className="font-display text-lg font-extrabold leading-tight">{b.title}</p>
            {b.priceLabel && (
              <p className="mt-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                {b.priceLabel}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default BundleDealsRail;
