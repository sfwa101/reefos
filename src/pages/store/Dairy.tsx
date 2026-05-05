import SinglePageStore, { type StoreCategory } from "@/components/SinglePageStore";
import { products } from "@/lib/products";
import { storeThemes } from "@/lib/storeThemes";

const cats: StoreCategory[] = [
  { id: "all", name: "الكل", match: (p) => p.source === "dairy" },
  { id: "milk", name: "حليب", match: (p) => p.source === "dairy" && p.subCategory === "حليب" },
  { id: "cheese", name: "أجبان", match: (p) => p.source === "dairy" && p.subCategory === "أجبان" },
  { id: "yogurt", name: "زبادي", match: (p) => p.source === "dairy" && p.subCategory === "زبادي" },
  { id: "butter", name: "زبدة", match: (p) => p.source === "dairy" && p.subCategory === "زبدة" },
  { id: "eggs", name: "بيض", match: (p) => p.source === "dairy" && p.subCategory === "بيض" },
];

const Dairy = () => {
  const theme = storeThemes.dairy;
  return (
    <SinglePageStore
      themeKey="dairy"
      title="منتجات الألبان"
      subtitle="من المزرعة مباشرة إلى مائدتك"
      searchPlaceholder="ابحث في الألبان…"
      products={products}
      categories={cats}
      hero={
        <section className="rounded-[1.75rem] p-5 shadow-tile" style={{ background: theme.gradient }}>
          <span className="text-[10px] font-bold text-foreground/80">طازج اليوم</span>
          <h2 className="font-display text-2xl font-extrabold text-foreground">حليب صباحي</h2>
          <p className="mt-1 text-xs text-foreground/70">يصلك خلال ساعتين من الحلب</p>
        </section>
      }
    />
  );
};

export default Dairy;
