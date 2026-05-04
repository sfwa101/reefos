import BackHeader from "@/components/BackHeader";
import { storeThemes } from "@/lib/storeThemes";
import { useRestaurantsLogic } from "./hooks/useRestaurantsLogic";
import { RestaurantsHero } from "./components/RestaurantsHero";
import { RestaurantsSearchBar } from "./components/RestaurantsSearchBar";
import { BrandTabs } from "./components/BrandTabs";
import { RestaurantSection } from "./components/RestaurantSection";
import {
  RestaurantsEmptyState,
  RestaurantsSkeletonList,
} from "./components/RestaurantsStates";
import { slug } from "./types";

/**
 * RestaurantsPage — Lego shell.
 * All state and Supabase fetching live in `useRestaurantsLogic`.
 */
const RestaurantsPage = () => {
  const theme = storeThemes.restaurants;
  const {
    loading,
    query,
    setQuery,
    activeBrand,
    grouped,
    allBrands,
    handleJump,
  } = useRestaurantsLogic();

  return (
    <div className="space-y-4 pb-12">
      <BackHeader
        title="مجمع المطاعم"
        subtitle="ألذ الوجبات من أفضل مطاعم المدينة"
        accent="مطاعم"
        themeKey="restaurants"
      />

      <RestaurantsHero gradient={theme.gradient} />
      <RestaurantsSearchBar value={query} onChange={setQuery} />

      {!loading && (
        <BrandTabs
          brands={allBrands}
          activeBrand={activeBrand}
          onJump={handleJump}
        />
      )}

      {loading && <RestaurantsSkeletonList />}

      {!loading && grouped.length === 0 && <RestaurantsEmptyState />}

      {!loading &&
        grouped.map(([brand, list]) => (
          <RestaurantSection
            key={brand}
            brand={brand}
            list={list}
            anchorId={slug(brand)}
          />
        ))}
    </div>
  );
};

export default RestaurantsPage;
