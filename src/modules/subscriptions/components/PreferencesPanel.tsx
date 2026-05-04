import { memo } from "react";
import { Leaf, AlertCircle, Truck, Pause } from "lucide-react";
import { DIET_PREFS, ALLERGIES, TIME_SLOTS } from "../constants";

interface Props {
  people: number;
  setPeople: (updater: (p: number) => number) => void;
  diets: Set<string>;
  toggleDiet: (v: string) => void;
  allergic: Set<string>;
  toggleAllergy: (v: string) => void;
  slot: string;
  setSlot: (v: string) => void;
  paused: boolean;
  togglePaused: () => void;
}

const PreferencesPanel = memo(function PreferencesPanel({
  people, setPeople, diets, toggleDiet, allergic, toggleAllergy,
  slot, setSlot, paused, togglePaused,
}: Props) {
  return (
    <>
      {/* People */}
      <section className="glass-strong flex items-center justify-between rounded-2xl p-4 shadow-soft">
        <div>
          <p className="font-display text-sm font-extrabold">عدد الأفراد</p>
          <p className="text-[11px] text-muted-foreground">يضرب السعر ×{people}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setPeople((p) => Math.max(1, p - 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10">−</button>
          <span className="w-6 text-center font-display text-lg font-extrabold tabular-nums">{people}</span>
          <button onClick={() => setPeople((p) => Math.min(8, p + 1))} className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">+</button>
        </div>
      </section>

      {/* Diet */}
      <section className="space-y-2">
        <h3 className="px-1 font-display text-base font-extrabold flex items-center gap-2">
          <Leaf className="h-4 w-4 text-primary" /> تفضيلات الطعام
        </h3>
        <div className="flex flex-wrap gap-2">
          {DIET_PREFS.map((d) => {
            const on = diets.has(d);
            return (
              <button
                key={d}
                onClick={() => toggleDiet(d)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  on ? "bg-primary text-primary-foreground" : "glass"
                }`}
              >
                {on && "✓ "}{d}
              </button>
            );
          })}
        </div>
      </section>

      {/* Allergies */}
      <section className="space-y-2">
        <h3 className="px-1 font-display text-base font-extrabold flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" /> حساسيات يجب تجنبها
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALLERGIES.map((a) => {
            const on = allergic.has(a);
            return (
              <button
                key={a}
                onClick={() => toggleAllergy(a)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  on ? "bg-destructive text-destructive-foreground" : "glass"
                }`}
              >
                {on ? "✕ " : ""}{a}
              </button>
            );
          })}
        </div>
      </section>

      {/* Slot */}
      <section className="space-y-2">
        <h3 className="px-1 font-display text-base font-extrabold flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" /> ميعاد التوصيل
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              onClick={() => setSlot(t)}
              className={`rounded-xl py-2 text-[11px] font-bold transition ${
                slot === t ? "bg-foreground text-background" : "glass"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Pause */}
      <section className="glass-strong flex items-center justify-between rounded-2xl p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <Pause className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-bold">إيقاف مؤقت</p>
            <p className="text-[10px] text-muted-foreground">أوقف اشتراكك دون إلغاء</p>
          </div>
        </div>
        <button
          onClick={togglePaused}
          className={`relative h-7 w-12 rounded-full transition ${paused ? "bg-primary" : "bg-foreground/15"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${paused ? "right-0.5" : "right-6"}`} />
        </button>
      </section>
    </>
  );
});

export default PreferencesPanel;
