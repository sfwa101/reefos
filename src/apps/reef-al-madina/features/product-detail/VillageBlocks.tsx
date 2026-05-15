import { Repeat, ShieldCheck } from "lucide-react";
import { toLatin } from "@/lib/format";
import type { villageMetaFor } from "@/core/commerce/knowledge/sourcing-meta";
import { Button } from "@/components/ui/button";

type Village = NonNullable<ReturnType<typeof villageMetaFor>>;

/** Origin story card. */
export const VillageStory = ({ village }: { village: Village }) => {
  if (!village.story) return null;
  return (
    <section
      className="relative overflow-hidden rounded-[1.5rem] p-5 shadow-soft"
      style={{
        background: "linear-gradient(135deg, #FBF7EE 0%, #F5EFE0 100%)",
        border: "1px solid #E8DFC9",
      }}
    >
      <div
        className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #B8860B, transparent 70%)" }}
      />
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xl" aria-hidden>👩‍🌾</span>
        <h3 className="font-display text-base font-extrabold" style={{ color: "#3A341E" }}>
          من أين يأتي طعامك؟
        </h3>
      </div>
      {village.source && (
        <p className="mb-2 text-[11px] font-bold" style={{ color: "#B8860B" }}>
          <ShieldCheck className="me-1 inline h-3 w-3" />
          {village.source}
        </p>
      )}
      <p className="text-[13.5px] leading-relaxed" style={{ color: "#3A341E", fontStyle: "italic" }}>
        "{village.story}"
      </p>
    </section>
  );
};

export const VillageStorage = ({ village }: { village: Village }) => {
  if (!village.storage || village.storage.length === 0) return null;
  return (
    <section className="grid grid-cols-3 gap-2">
      {village.storage.map((s, i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-1 rounded-2xl p-3 text-center"
          style={{ background: "#FFFDF8", border: "1px solid #E8DFC9", color: "#3A341E" }}
        >
          <span className="text-xl leading-none" aria-hidden>{s.icon}</span>
          <p className="text-[10px] font-bold leading-tight">{s.label}</p>
        </div>
      ))}
    </section>
  );
};

export const VillageSubscription = ({
  village, unitPrice, subMode, setSubMode,
}: {
  village: Village;
  unitPrice: number;
  subMode: boolean;
  setSubMode: (v: boolean) => void;
}) => {
  if (!village.routine) return null;
  return (
    <section className="space-y-2">
      <p className="px-1 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: "#7B6A3F" }}>
        اختر طريقة الشراء
      </p>
      <div className="grid grid-cols-1 gap-2.5">
        <Button
          onClick={() => setSubMode(false)}
          className="relative flex items-center justify-between rounded-2xl p-4 text-right transition active:scale-[0.99]"
          style={{
            background: !subMode ? "#FFFDF8" : "#FBF7EE",
            border: !subMode ? "2px solid #3A341E" : "1px solid #E8DFC9",
            color: "#3A341E",
          }}
        >
          <div>
            <p className="text-[13px] font-extrabold">شراء مرة واحدة</p>
            <p className="mt-0.5 text-[11px]" style={{ color: "#7B6A3F" }}>توصيل لمرة واحدة فقط</p>
          </div>
          <div className="text-left">
            <span className="font-display text-lg font-extrabold tabular-nums">{toLatin(unitPrice)}</span>
            <span className="ms-0.5 text-[10px]">ج.م</span>
          </div>
        </Button>

        <Button
          onClick={() => setSubMode(true)}
          className="relative flex items-center justify-between overflow-hidden rounded-2xl p-4 text-right transition active:scale-[0.99]"
          style={{
            background: subMode
              ? "linear-gradient(135deg, #5A6E3A 0%, #3F5226 100%)"
              : "linear-gradient(135deg, #FBF7EE 0%, #F0E5C2 100%)",
            border: subMode ? "2px solid #3A341E" : "1px solid #B8860B",
            color: subMode ? "#FBF7EE" : "#3A341E",
          }}
        >
          <span
            className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-extrabold"
            style={{
              background: subMode ? "rgba(255,255,255,0.18)" : "#B8860B",
              color: "#FBF7EE",
            }}
          >
            وفّر {toLatin(village.routine.discountPct)}٪
          </span>
          <div>
            <p className="text-[13px] font-extrabold">
              <Repeat className="me-1 inline h-3 w-3" />
              اشتراك {village.routine.defaultFrequency === "weekly" ? "أسبوعي" : "كل أسبوعين"}
            </p>
            <p className="mt-0.5 text-[11px] opacity-90">اضمن حصتك · ألغِ في أي وقت</p>
          </div>
          <div className="text-left">
            <span className="font-display text-lg font-extrabold tabular-nums">
              {toLatin(Math.round(unitPrice * (1 - village.routine.discountPct / 100)))}
            </span>
            <span className="ms-0.5 text-[10px]">ج.م</span>
          </div>
        </Button>
      </div>
    </section>
  );
};

export const VillageNutrition = ({ village }: { village: Village }) => {
  if (!village.nutrition) return null;
  const n = village.nutrition;
  return (
    <section
      className="rounded-2xl p-4"
      style={{
        background: "#FFFDF8",
        border: "2px solid #3A341E",
        boxShadow: "0 1px 0 #3A341E inset",
        color: "#3A341E",
      }}
    >
      <h3 className="font-display text-lg font-extrabold uppercase tracking-wide" style={{ borderBottom: "6px solid #3A341E", paddingBottom: 4 }}>
        Nutrition Facts · القيم الغذائية
      </h3>
      <p className="mt-1 text-[10.5px]" style={{ color: "#7B6A3F" }}>الحصة الواحدة</p>
      <div className="mt-2 divide-y" style={{ borderColor: "#E8DFC9" }}>
        {n.calories && (
          <div className="flex items-baseline justify-between py-2">
            <span className="text-sm font-extrabold">السعرات الحرارية</span>
            <span className="font-display text-base font-extrabold tabular-nums">{n.calories}</span>
          </div>
        )}
        {n.protein && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-[12px] font-bold">البروتين</span>
            <span className="text-[13px] font-extrabold tabular-nums">{n.protein}</span>
          </div>
        )}
        {n.fat && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-[12px] font-bold">الدهون</span>
            <span className="text-[13px] font-extrabold tabular-nums">{n.fat}</span>
          </div>
        )}
        {n.carbs && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-[12px] font-bold">الكربوهيدرات</span>
            <span className="text-[13px] font-extrabold tabular-nums">{n.carbs}</span>
          </div>
        )}
      </div>
      {n.notes && (
        <p className="mt-2 text-[11px] italic" style={{ color: "#7B6A3F" }}>{n.notes}</p>
      )}
    </section>
  );
};
