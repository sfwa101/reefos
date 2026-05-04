import { memo } from "react";
import { Leaf } from "lucide-react";
import TypewriterPlaceholder from "@/components/TypewriterPlaceholder";
import villageHero from "@/assets/village-hero.jpg";

const VillageHero = memo(function VillageHero() {
  return (
    <section
      className="relative mt-3 overflow-hidden rounded-[1.75rem] shadow-tile"
      style={{ aspectRatio: "16/10" }}
    >
      <img
        src={villageHero}
        alt="من المزرعة إلى مائدتك"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(58,52,30,0) 30%, rgba(40,35,18,0.85) 100%)",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
          <Leaf className="h-3 w-3" />
          بوتيك ريف المدينة
        </div>
        <h2 className="font-display text-2xl font-extrabold leading-tight">
          <TypewriterPlaceholder
            options={[
              "من المزرعة إلى مائدتك",
              "بدون إضافات.. طبيعة ١٠٠٪",
              "كل قطرة لها قصة",
            ]}
          />
        </h2>
        <p className="mt-1 text-[11px] opacity-90">
          منتجات أصيلة · مزارعون موثوقون · إنتاج محدود
        </p>
      </div>
    </section>
  );
});

export default VillageHero;
