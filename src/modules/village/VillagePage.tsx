import BackHeader from "@/components/BackHeader";
import { useVillageLogic } from "./hooks/useVillageLogic";
import VillageHero from "./components/VillageHero";
import VillageSearchBar from "./components/VillageSearchBar";
import VillageFilterChips from "./components/VillageFilterChips";
import VillageProductGrid from "./components/VillageProductGrid";

const VillagePage = () => {
  const {
    query,
    setQuery,
    tag,
    setTag,
    subCat,
    setSubCat,
    items,
    isRoutineActive,
    toggleRoutine,
  } = useVillageLogic();

  return (
    <div
      className="-mx-4 -my-4 px-4 py-4"
      style={{
        background: "linear-gradient(180deg, #FBF7EE 0%, #F5EFE0 100%)",
        minHeight: "100vh",
      }}
    >
      <BackHeader
        title="منتجات القرية"
        subtitle="بوتيك المزرعة الفاخر"
        accent="حصري"
        themeKey="village"
      />

      <VillageHero />

      <VillageSearchBar value={query} onChange={setQuery} />

      <VillageFilterChips
        subCat={subCat}
        setSubCat={setSubCat}
        tag={tag}
        setTag={setTag}
      />

      <section className="mt-5">
        <VillageProductGrid
          items={items}
          isRoutineActive={isRoutineActive}
          onToggleRoutine={toggleRoutine}
        />
      </section>

      <div className="h-24" />
    </div>
  );
};

export default VillagePage;
