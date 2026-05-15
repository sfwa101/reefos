import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  /** YYYY-MM-DD or "" */
  value: string;
  onChange: (iso: string) => void;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
};

const pad = (n: number) => `${n}`.padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const formatBirth = (iso: string) => {
  if (!iso) return "اضغط لاختيار تاريخ الميلاد";
  return new Intl.DateTimeFormat("ar-EG", { day: "2-digit", month: "long", year: "numeric" })
    .format(new Date(`${iso}T00:00:00`));
};

/**
 * Birth date picker — opens a bottom sheet with a calendar only on tap.
 * Replaces the old scroll-wheel which fired on accidental scroll.
 */
const BirthDatePicker = ({ value, onChange, minDate, maxDate, className }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date | undefined>(value ? new Date(`${value}T00:00:00`) : undefined);

  const safeMin = useMemo(() => minDate ?? new Date("1925-01-01"), [minDate]);
  const safeMax = useMemo(() => maxDate ?? new Date(), [maxDate]);

  const confirm = () => {
    if (draft) onChange(toIso(draft));
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          className={cn(
            "flex w-full items-center justify-between gap-3 rounded-[1.2rem] border border-border/60 bg-background/80 px-4 py-3 text-right transition active:scale-[0.99]",
            className,
          )}
          aria-label="اختر تاريخ الميلاد"
        >
          <span className={cn("text-sm font-extrabold", value ? "text-foreground" : "text-muted-foreground")}>
            {formatBirth(value)}
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-right">
          <SheetTitle>تاريخ الميلاد</SheetTitle>
        </SheetHeader>
        <div className="mt-2 flex justify-center pb-2">
          <Calendar
            mode="single"
            selected={draft}
            onSelect={setDraft}
            defaultMonth={draft ?? new Date(safeMax.getFullYear() - 25, 0, 1)}
            captionLayout="dropdown"
            startMonth={safeMin}
            endMonth={safeMax}
            disabled={(d) => d < safeMin || d > safeMax}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </div>
        <SheetFooter className="grid grid-cols-2 gap-2">
          <SheetClose asChild>
            <Button type="button" className="h-12 rounded-full border border-border/60 bg-background text-sm font-extrabold">
              إلغاء
            </Button>
          </SheetClose>
          <Button
            type="button"
            onClick={confirm}
            disabled={!draft}
            className="h-12 rounded-full bg-primary text-sm font-extrabold text-primary-foreground shadow-pill disabled:opacity-50"
          >
            تأكيد
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default BirthDatePicker;
