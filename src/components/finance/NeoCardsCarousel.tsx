import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { NeoSuperCard } from "./NeoSuperCard";
import type { WalletAsset } from "@/core/finance/hooks/useWalletAssets";
import { Button } from "@/components/ui/button";

type Props = {
  assets: WalletAsset[];
  hidden: boolean;
  onToggleHide: () => void;
  ownerName: string;
  onAssetChange?: (asset: WalletAsset) => void;
};

/**
 * NeoCardsCarousel — Embla-driven horizontal swiper.
 * Center-snap with peek of neighbour cards (Papara style).
 */
export function NeoCardsCarousel({
  assets,
  hidden,
  onToggleHide,
  ownerName,
  onAssetChange,
}: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    direction: "rtl",
    containScroll: "trimSnaps",
  });
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setIndex(i);
      onAssetChange?.(assets[i]);
    };
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, assets, onAssetChange]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 px-[6vw] py-2">
          {assets.map((a, i) => (
            <NeoSuperCard
              key={a.type}
              asset={a}
              active={i === index}
              hidden={hidden}
              onToggleHide={onToggleHide}
              ownerName={ownerName}
            />
          ))}
        </div>
      </div>

      {/* dot dock */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {assets.map((a, i) => (
          <Button
            key={a.type}
            type="button"
            aria-label={`عرض ${a.label}`}
            onClick={() => emblaApi?.scrollTo(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-primary" : "w-1.5 bg-foreground/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
