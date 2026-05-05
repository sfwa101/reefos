import SinglePageStore, { type StoreCategory } from "@/components/SinglePageStore";
import { products } from "@/lib/products";
import { storeThemes } from "@/lib/storeThemes";
import { Leaf } from "lucide-react";

const cats: StoreCategory[] = [
  { id: "all", name: "الكل", match: (p) => p.source === "produce" },
  { id: "veg", name: "خضار طازجة", match: (p) => p.source === "produce" && p.subCategory === "خضار طازجة" },
  { id: "fruit", name: "فواكه طازجة", match: (p) => p.source === "produce" && p.subCategory === "فواكه طازجة" },
  { id: "citrus", name: "حمضيات", match: (p) => p.source === "produce" && p.subCategory === "حمضيات" },
  { id: "leafy", name: "ورقيات", match: (p) => p.source === "produce" && p.subCategory === "خضروات ورقية" },
  { id: "berries", name: "توت", match: (p) => p.source === "produce" && p.subCategory === "توت وفواكه حمراء" },
];

const Produce = () => {
  const theme = storeThemes.produce;
  return (
    <SinglePageStore
      themeKey="produce"
      title="الخضار والفواكه"
      subtitle="حصاد اليوم من المزارع"
      searchPlaceholder="ابحث في الخضار والفواكه…"
      products={products}
      categories={cats}
      hero={
        <section className="rounded-[1.75rem] p-5 shadow-tile" style={{ background: theme.gradient }}>
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-foreground/80" />
            <span className="text-[10px] font-bold text-foreground/80">حصاد اليوم</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-extrabold text-foreground tabular-nums">طازج خلال 4 ساعات</h2>
          <p className="mt-1 text-xs text-foreground/70">من المزرعة إلى بابك</p>
        </section>
      }
    />
  );
};

export default Produce;
