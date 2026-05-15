// Booking date/time + shipment mode + payment plan selector.
// Used only for fulfillment Type C (booking). Pure presentation.

import {
  Banknote, CalendarDays, Check, Clock, PackageCheck, Truck, Wallet,
} from "lucide-react";
import { fmtMoney, toLatin } from "@/lib/format";
import { bookingTimeSlots } from "@/core/commerce/variants/custom-fulfillment-rules";
import { Button } from "@/components/ui/button";

type ShipMode = "split" | "wait";

type Props = {
  days: Date[];
  dayIdx: number;
  onDayChange: (i: number) => void;
  slot: string;
  onSlotChange: (id: string) => void;
  shipMode: ShipMode;
  onShipModeChange: (m: ShipMode) => void;
  // Payment plan
  depositRequired: boolean;
  effectivePayDeposit: boolean;
  depositAmount: number;
  remainderOnDelivery: number;
  lineTotal: number;
  onPayDepositChange: (v: boolean) => void;
};

export const FulfillmentSelector = ({
  days, dayIdx, onDayChange, slot, onSlotChange, shipMode, onShipModeChange,
  depositRequired, effectivePayDeposit, depositAmount, remainderOnDelivery,
  lineTotal, onPayDepositChange,
}: Props) => (
  <>
    {/* Day picker */}
    <section>
      <div className="mb-2 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-extrabold">تاريخ الاستلام</h3>
      </div>
      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2 pb-1">
          {days.map((d, i) => {
            const active = i === dayIdx;
            const weekday = d.toLocaleDateString("ar-EG", { weekday: "short" });
            const day = d.toLocaleDateString("ar-EG", { day: "numeric" });
            const month = d.toLocaleDateString("ar-EG", { month: "short" });
            return (
              <Button
                key={i}
                onClick={() => onDayChange(i)}
                className={`flex w-[72px] shrink-0 flex-col items-center gap-0.5 rounded-2xl border-2 px-2 py-2.5 transition ${
                  active ? "border-violet-500 bg-violet-500 text-white shadow-pill" : "border-border bg-background text-foreground"
                }`}
              >
                <span className="text-[10px] font-bold opacity-80">{weekday}</span>
                <span className="font-display text-lg font-extrabold leading-none tabular-nums">{toLatin(Number(day))}</span>
                <span className="text-[9px] font-bold opacity-80">{month}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>

    {/* Time slot */}
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Clock className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-extrabold">وقت الاستلام</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {bookingTimeSlots.map((s) => {
          const active = s.id === slot;
          return (
            <Button
              key={s.id}
              onClick={() => onSlotChange(s.id)}
              className={`flex items-center justify-between rounded-[14px] border-2 px-3 py-2.5 text-[11px] font-extrabold transition ${
                active
                  ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                  : "border-border bg-background text-foreground"
              }`}
            >
              <span>{s.label}</span>
              {active && <Check className="h-3.5 w-3.5" />}
            </Button>
          );
        })}
      </div>
    </section>

    {/* Shipment mode */}
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Truck className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-extrabold">طريقة وصول الطلب</h3>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {[
          { id: "split" as const, title: "وصول على دفعتين", desc: "المنتجات الفورية تصلك الآن، والحجز في موعده.", icon: Truck },
          { id: "wait"  as const, title: "استلام كل الطلب مرة واحدة", desc: "ننتظر تجهيز الحجز ونوصّل كل شيء معاً في الموعد.", icon: PackageCheck },
        ].map((m) => {
          const active = shipMode === m.id;
          const Icon = m.icon;
          return (
            <Button
              key={m.id}
              onClick={() => onShipModeChange(m.id)}
              className={`flex items-start gap-3 rounded-[14px] border-2 p-3 text-right transition ${
                active ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-border bg-background"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                active ? "bg-violet-500 text-white" : "bg-foreground/5 text-foreground"
              }`}>
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold">{m.title}</p>
                <p className="text-[10px] text-muted-foreground">{m.desc}</p>
              </div>
              <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                active ? "border-violet-500 bg-violet-500" : "border-muted-foreground/40"
              }`} />
            </Button>
          );
        })}
      </div>
    </section>

    {/* Payment plan */}
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Wallet className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-extrabold">
          خطة الدفع
          {depositRequired && (
            <span className="ms-2 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-800 dark:text-amber-300">
              عربون إجباري
            </span>
          )}
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {[
          {
            id: "deposit",
            title: `ادفع عربون 50٪ الآن (${fmtMoney(depositAmount)})`,
            desc: `والباقي ${fmtMoney(remainderOnDelivery || Math.round(lineTotal * 0.5))} عند الاستلام.`,
            icon: Wallet,
            on: effectivePayDeposit,
            onClick: () => !depositRequired && onPayDepositChange(true),
          },
          {
            id: "full",
            title: "ادفع المبلغ كاملاً مقدماً",
            desc: `${fmtMoney(lineTotal)} الآن — ولا شيء عند الاستلام.`,
            icon: Banknote,
            on: !effectivePayDeposit && !depositRequired,
            onClick: () => !depositRequired && onPayDepositChange(false),
          },
        ].map((opt) => {
          const Icon = opt.icon;
          const disabled = depositRequired && opt.id === "full";
          return (
            <Button
              key={opt.id}
              onClick={opt.onClick}
              disabled={disabled}
              className={`flex items-start gap-3 rounded-[14px] border-2 p-3 text-right transition ${
                opt.on ? "border-violet-500 bg-violet-50 dark:bg-violet-500/10" : "border-border bg-background"
              } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${
                opt.on ? "bg-violet-500 text-white" : "bg-foreground/5 text-foreground"
              }`}>
                <Icon className="h-4 w-4" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-extrabold">{opt.title}</p>
                <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
              </div>
              <span className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                opt.on ? "border-violet-500 bg-violet-500" : "border-muted-foreground/40"
              }`} />
            </Button>
          );
        })}
      </div>
    </section>
  </>
);
