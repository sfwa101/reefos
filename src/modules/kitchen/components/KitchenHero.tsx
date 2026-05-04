import { memo } from "react";
import { Clock, Flame } from "lucide-react";

const KitchenHeroComponent = () => (
  <section
    className="relative mb-4 overflow-hidden rounded-[1.75rem] p-5 shadow-tile"
    style={{
      background:
        "linear-gradient(135deg, hsl(20 60% 28%), hsl(15 50% 40%) 60%, hsl(35 70% 60%))",
    }}
  >
    <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
    <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">
      مطبخ السحاب الذكي
    </span>
    <h2 className="mt-3 font-display text-2xl font-extrabold text-white text-balance">
      احجز وجبتك مسبقاً واستلمها طازجة
    </h2>
    <div className="mt-3 flex items-center gap-3 text-[11px] text-white/85 tabular-nums">
      <span className="flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> توصيل ٣٠ د
      </span>
      <span className="flex items-center gap-1">
        <Flame className="h-3.5 w-3.5" /> طبخ يومي
      </span>
    </div>
  </section>
);

export const KitchenHero = memo(KitchenHeroComponent);
