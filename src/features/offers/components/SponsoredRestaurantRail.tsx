import { useMemo } from "react";
import { products, useProductsVersion } from "@/lib/products";
import { getRestaurantById } from "@/lib/restaurants";
import { ChefHat, Star } from "lucide-react";
import { Link } from "@tanstack/react-router";

export type SponsoredRestaurantRailProps = {
  title: string;
  subtitle?: string | null;
  restaurantId: string | null;
};

const SponsoredRestaurantRail = ({
  title,
  subtitle,
  restaurantId,
}: SponsoredRestaurantRailProps) => {
  const _pv = useProductsVersion();
  const restaurant = restaurantId ? getRestaurantById(restaurantId) : undefined;

  const items = useMemo(() => {
    if (!restaurant) return [];
    return restaurant.productIds
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .slice(0, 8);
  }, [restaurant, _pv]);

  if (!restaurant || items.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-3xl p-4 shadow-tile"
      style={{
        background: `linear-gradient(135deg, hsl(${restaurant.brandHue}) 0%, hsl(${restaurant.brandSoft}) 100%)`,
      }}
    >
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      <div className="relative mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 backdrop-blur-sm font-display text-lg font-extrabold text-white">
            {restaurant.monogram}
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/80">إعلان • {title}</p>
            <h3 className="font-display text-base font-extrabold leading-tight text-white">
              {restaurant.name}
            </h3>
            {subtitle ? <p className="text-[11px] text-white/85">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
          <Star className="h-3 w-3 fill-current" />
          {restaurant.rating}
        </div>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar snap-x">
        {items.map((p) => (
          <Link
            key={p.id}
            to="/product/$productId"
            params={{ productId: p.id }}
            className="w-[150px] shrink-0 snap-start rounded-2xl bg-white/95 p-2 text-foreground shadow-sm"
          >
            <div className="aspect-square overflow-hidden rounded-xl bg-muted">
              {p.image ? (
                <img src={p.image} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ChefHat className="h-6 w-6" />
                </div>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-[11px] font-bold leading-tight">{p.name}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="font-display text-sm font-extrabold">{p.price} ج</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                اطلب
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default SponsoredRestaurantRail;
