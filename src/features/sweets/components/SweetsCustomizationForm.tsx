// Note + quantity stepper for the sweets sheet. Pure UI.

import { MessageSquare } from "lucide-react";
import { toLatin } from "@/lib/format";

type Props = {
  note: string;
  onNoteChange: (v: string) => void;
  qty: number;
  onQtyChange: (v: number) => void;
  isBooking: boolean;
};

export const SweetsCustomizationForm = ({
  note, onNoteChange, qty, onQtyChange, isBooking,
}: Props) => (
  <>
    <section>
      <div className="mb-2 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-violet-600" />
        <h3 className="text-sm font-extrabold">
          ملاحظة خاصة{" "}
          <span className="text-[10px] font-bold text-muted-foreground">(اختياري)</span>
        </h3>
      </div>
      <textarea
        rows={2}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={isBooking ? "مثال: اكتب «عيد ميلاد سعيد - أحمد» على التورتة" : "أي طلب خاص؟"}
        className="w-full rounded-[14px] bg-foreground/5 px-3 py-2.5 text-sm outline-none ring-1 ring-border/40 transition focus:ring-violet-500"
      />
    </section>

    <section className="flex items-center justify-between rounded-2xl bg-foreground/5 p-3">
      <span className="text-sm font-extrabold">الكمية</span>
      <div className="flex items-center gap-2 rounded-full bg-background p-0.5 shadow-pill">
        <button
          onClick={() => onQtyChange(Math.max(1, qty - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-foreground active:scale-90"
          aria-label="إنقاص"
        >−</button>
        <span className="w-7 text-center text-sm font-extrabold tabular-nums">{toLatin(qty)}</span>
        <button
          onClick={() => onQtyChange(qty + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white active:scale-90"
          aria-label="زيادة"
        >+</button>
      </div>
    </section>
  </>
);
