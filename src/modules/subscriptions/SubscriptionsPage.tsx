import BackHeader from "@/components/BackHeader";
import { useSubscriptionsLogic } from "./hooks/useSubscriptionsLogic";
import SubscriptionHero from "./components/SubscriptionHero";
import PlanPicker from "./components/PlanPicker";
import FrequencyDurationPicker from "./components/FrequencyDurationPicker";
import DailyMealPicker from "./components/DailyMealPicker";
import PreferencesPanel from "./components/PreferencesPanel";
import FeaturesList from "./components/FeaturesList";
import SummaryCTA from "./components/SummaryCTA";
import MealPickerSheet from "./components/MealPickerSheet";

const SubscriptionsPage = () => {
  const s = useSubscriptionsLogic();

  return (
    <div className="space-y-6">
      <BackHeader
        title="اشتراكات الريف"
        subtitle="باقات ذكية ومرنة لكل أسلوب حياة"
        accent="متجر"
        themeKey="subscriptions"
      />

      <SubscriptionHero />

      <PlanPicker planId={s.planId} onSelect={s.setPlanId} />

      <FrequencyDurationPicker
        freq={s.freq}
        setFreq={s.setFreq}
        dur={s.dur}
        setDur={s.setDur}
      />

      <DailyMealPicker
        activeDays={s.activeDays}
        dailyMeals={s.dailyMeals}
        filledCount={s.filledCount}
        openPicker={s.openPicker}
        autoFillWeek={s.autoFillWeek}
      />

      <PreferencesPanel
        people={s.people}
        setPeople={s.setPeople}
        diets={s.diets}
        toggleDiet={s.toggleDiet}
        allergic={s.allergic}
        toggleAllergy={s.toggleAllergy}
        slot={s.slot}
        setSlot={s.setSlot}
        paused={s.paused}
        togglePaused={s.togglePaused}
      />

      <FeaturesList />

      <SummaryCTA
        planTitle={s.plan.title}
        durLabel={s.durObj.label}
        filledCount={s.filledCount}
        totalDays={s.activeDays.length}
        slot={s.slot}
        totalPrice={s.totalPrice}
      />

      <MealPickerSheet
        pickerDay={s.pickerDay}
        availableMeals={s.availableMeals}
        dailyMeals={s.dailyMeals}
        onPick={s.pickMealForDay}
        onClose={s.closePicker}
      />
    </div>
  );
};

export default SubscriptionsPage;
