import { memo } from "react";

interface Props {
  readonly gradient: string;
}

const RestaurantsHeroComponent = ({ gradient }: Props) => (
  <section
    className="rounded-[1.75rem] p-5 shadow-tile"
    style={{ background: gradient }}
  >
    <span className="text-[10px] font-bold text-foreground/80">
      مجمع ذكي · توصيل موحّد
    </span>
    <h2 className="font-display text-2xl font-extrabold text-foreground">
      طعمك المفضّل
    </h2>
    <p className="mt-1 text-xs text-foreground/70">
      اطلب من أكثر من مطعم في نفس السلة — نوصل لباب البيت
    </p>
  </section>
);

export const RestaurantsHero = memo(RestaurantsHeroComponent);
