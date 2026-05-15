/**
 * MealCard — restaurant / ready-meals template.
 *
 * Triggered by capability `supports_meal_mode`. Photo-dominant 16:9 layout
 * with kitchen/restaurant subtitle, optional portion selector (when the
 * product also has `supports_variants`), ETA badge, and a primary order
 * CTA. RTL-first; uses semantic design tokens only.
 */
import { Clock, Flame } from "lucide-react";
import { useState } from "react";

import OptimizedImage from "@/components/ui/OptimizedImage";
import { CAP } from "@/core/capabilities/CapabilityRegistry";
import { toLatin } from "@/lib/format";

import type { CardTemplateProps } from "./types";
import { pickName } from "./types";
import { Button } from "@/components/ui/button";

const PORTIONS = ["صغير", "وسط", "كبير"] as const;

export function MealCard({ vm, onOpen, onAddToCart }: CardTemplateProps) {
  const supportsPortions = vm.capabilities.includes(CAP.VARIANTS);
  const [portion, setPortion] = useState<(typeof PORTIONS)[number]>("وسط");

  const name = pickName(vm.name);
  const kitchen =
    (vm.attributes.kitchen_name as string | undefined) ??
    (vm.attributes.brand as string | undefined) ??
    pickName(vm.shortDescription);
  const etaMin =
    (vm.attributes.eta_minutes as number | undefined) ??
    (vm.attributes.delivery_eta_minutes as number | undefined);

  return (
    <article
      dir="rtl"
      onClick={onOpen}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-right shadow-soft ring-1 ring-border/50 transition active:scale-[0.99]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "320px 320px" }}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-secondary/40">
        {vm.hero?.url && (
          <OptimizedImage
            src={vm.hero.url}
            alt={pickName(vm.hero.alt) || name}
            width={768}
            height={432}
            className="h-full w-full object-cover object-center"
            wrapperClassName="absolute inset-0"
          />
        )}
        {typeof etaMin === "number" && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[10px] font-extrabold text-background backdrop-blur">
            <Clock className="h-3 w-3" />
            {toLatin(etaMin)} د
          </span>
        )}
        {vm.badges.find((b) => b.key === "spicy") && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-1 text-[10px] font-extrabold text-destructive-foreground">
            <Flame className="h-3 w-3" />
            حار
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {kitchen && (
          <p className="text-[10px] font-medium text-muted-foreground line-clamp-1">
            {kitchen}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-extrabold leading-tight text-foreground">
          {name}
        </h3>

        {supportsPortions && (
          <div
            className="flex gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            {PORTIONS.map((p) => (
              <Button
                key={p}
                onClick={() => setPortion(p)}
                className={`flex-1 rounded-full px-2 py-1 text-[10px] font-bold transition ${
                  portion === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {p}
              </Button>
            ))}
          </div>
        )}

        <div className="mt-1 flex items-end justify-between">
          <div className="leading-none">
            <span className="font-display text-lg font-extrabold tabular-nums">
              {toLatin(vm.price.amount.toLocaleString("en-US"))}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground"> ج.م</span>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(vm.id);
            }}
            disabled={!vm.inStock}
            className="rounded-full bg-primary px-4 py-2 text-[11px] font-extrabold text-primary-foreground shadow-pill transition active:scale-95 disabled:bg-muted disabled:text-muted-foreground"
          >
            {vm.inStock ? "اطلب الآن" : "غير متاح"}
          </Button>
        </div>
      </div>
    </article>
  );
}
