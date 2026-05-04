import BackHeader from "@/components/BackHeader";
import MealSheet from "@/components/kitchen/MealSheet";
import { dayNamesAr } from "@/lib/kitchenMenu";
import { useKitchenLogic } from "./hooks/useKitchenLogic";
import { KitchenHero } from "./components/KitchenHero";
import { KitchenTabs } from "./components/KitchenTabs";
import { WeeklyView } from "./components/WeeklyView";
import { DailyView } from "./components/DailyView";

/**
 * KitchenPage — Lego shell.
 * All state lives in `useKitchenLogic`. All visuals are memoized children.
 */
const KitchenPage = () => {
  const {
    tab,
    setTab,
    activeDay,
    setActiveDay,
    catFilter,
    setCatFilter,
    query,
    setQuery,
    openMeal,
    setOpenMeal,
    closeMeal,
    dayMeals,
    deadline,
    isClosed,
    filteredDaily,
  } = useKitchenLogic();

  return (
    <div className="px-4 pb-24 pt-1">
      <BackHeader title="مطبخ ريف المدينة" subtitle="وجبات طازجة كل يوم" />

      <KitchenHero />
      <KitchenTabs tab={tab} onChange={setTab} />

      {tab === "weekly" ? (
        <WeeklyView
          activeDay={activeDay}
          setActiveDay={setActiveDay}
          meals={dayMeals}
          deadline={deadline}
          isClosed={isClosed}
          onOpen={setOpenMeal}
        />
      ) : (
        <DailyView
          query={query}
          setQuery={setQuery}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          meals={filteredDaily}
          onOpen={setOpenMeal}
        />
      )}

      <MealSheet
        meal={openMeal}
        open={!!openMeal}
        onClose={closeMeal}
        weeklyDay={tab === "weekly" ? activeDay : undefined}
        weeklyDayLabel={tab === "weekly" ? dayNamesAr[activeDay] : undefined}
      />
    </div>
  );
};

export default KitchenPage;
