import { Flame, Clock } from "lucide-react";
import { toLatin } from "@/lib/format";

export type DynamicHeroBannerProps = {
  title?: string;
  subtitle?: string;
  endsAt?: Date | null;
  countdown?: string;
};

const DynamicHeroBanner = ({
  title = "خصومات حتى 40٪",
  subtitle = "عرض الفلاش",
  countdown,
}: DynamicHeroBannerProps) => {
  return (
    <section
      className="relative overflow-hidden rounded-[1.75rem] p-5 shadow-tile"
      style={{ background: "linear-gradient(135deg, hsl(0 65% 45%), hsl(20 70% 55%))" }}
    >
      <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 text-[10px] font-bold text-white/90">
          <Flame className="h-3 w-3" /> {subtitle}
        </div>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-white text-balance">{title}</h2>
        {countdown && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white">
            <Clock className="h-3.5 w-3.5" /> ينتهي خلال{" "}
            <span className="tabular-nums">{toLatin(countdown)}</span>
          </div>
        )}
      </div>
    </section>
  );
};

export default DynamicHeroBanner;
