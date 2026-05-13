import { Inbox } from "lucide-react";

export function AdminEmptyState({
  title = "لا توجد بيانات", hint,
}: { title?: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card/60 backdrop-blur-xl border border-border/40 p-12 flex flex-col items-center gap-3 text-center shadow-soft">
      <div className="size-16 rounded-2xl bg-muted/40 grid place-items-center">
        <Inbox className="size-8 text-foreground/40" />
      </div>
      <h3 className="font-display text-lg">{title}</h3>
      {hint && <p className="text-[13px] text-foreground/60 max-w-md">{hint}</p>}
    </div>
  );
}
