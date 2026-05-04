import { memo } from "react";
import { FREQUENCIES, DURATIONS } from "../constants";

interface Props {
  freq: string;
  setFreq: (v: string) => void;
  dur: number;
  setDur: (v: number) => void;
}

const FrequencyDurationPicker = memo(function FrequencyDurationPicker({
  freq, setFreq, dur, setDur,
}: Props) {
  return (
    <>
      <section className="space-y-3">
        <h3 className="px-1 font-display text-xl font-extrabold">2. التكرار</h3>
        <div className="grid grid-cols-3 gap-2">
          {FREQUENCIES.map((f) => {
            const isActive = f.id === freq;
            return (
              <button
                key={f.id}
                onClick={() => setFreq(f.id)}
                className={`rounded-2xl py-3 text-center text-[11px] font-bold transition ${
                  isActive ? "bg-primary text-primary-foreground shadow-pill" : "glass text-foreground"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="px-1 font-display text-xl font-extrabold">3. مدة الاشتراك</h3>
        <div className="grid grid-cols-3 gap-2">
          {DURATIONS.map((d) => {
            const isActive = d.id === dur;
            return (
              <button
                key={d.id}
                onClick={() => setDur(d.id)}
                className={`relative rounded-2xl py-3 text-center transition ${
                  isActive ? "bg-foreground text-background shadow-pill" : "glass text-foreground"
                }`}
              >
                <p className="text-sm font-extrabold">{d.label}</p>
                {d.discount > 0 && (
                  <p className={`text-[10px] ${isActive ? "text-background/80" : "text-primary"}`}>
                    وفر {Math.round(d.discount * 100)}%
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
});

export default FrequencyDurationPicker;
