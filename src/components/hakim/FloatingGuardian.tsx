/**
 * Phase 64 — Hakim Floating Guardian (Adaptive Intelligence Pill)
 * ----------------------------------------------------------------
 * Progressive Disclosure: invisible by default. Renders only when the
 * authenticated user has unread `hakim_user_insights`. Tapping opens a
 * Sheet with the latest insight, the user's financial snapshot, and a
 * lightweight chat against the existing `hakim-chat` edge function.
 *
 * Strict adaptive tokens only — bg-card, text-foreground, ring-border, etc.
 * No hardcoded colors. Severity color comes from semantic role tokens
 * (primary / amber-flavored advisory / destructive). The amber advisory
 * cue uses `bg-warning` if the token is defined, otherwise falls back to
 * `bg-accent` to stay token-pure.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Loader2, AlertTriangle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useSovereignContext } from "@/core/capabilities/store/useSovereignContext";
import {
  chatHakimFn,
  markHakimInsightReadFn,
  type HakimInsight,
  type HakimSnapshot,
} from "@/core/identity/user.functions";
import {
  hakimInsightsQueryOptions,
  hakimSnapshotQueryOptions,
  userKeys,
} from "@/lib/user.queries";
import { Tracer } from "@/core/system/observability/Tracer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type InsightRow = HakimInsight;
type Snapshot = HakimSnapshot;

type ChatMessage = { role: "user" | "assistant"; content: string };

type Props = {
  workspace?: "wallet" | "pos" | "family";
  /** When true, render only the inline pill (no FAB). Used inside headers. */
  inline?: boolean;
};

const fmt = (n?: number): string =>
  typeof n === "number" ? n.toLocaleString("ar-EG", { maximumFractionDigits: 0 }) : "—";

export function FloatingGuardian({ workspace = "wallet", inline = false }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // Phase 65 — filter insights by the active workspace context.
  const activeWorkspaceId = useSovereignContext((s) => s.activeWorkspaceId);

  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: insightsData } = useQuery(
    hakimInsightsQueryOptions(Boolean(userId), activeWorkspaceId ?? null),
  );
  const insights = useMemo<InsightRow[]>(
    () => (insightsData ?? []) as InsightRow[],
    [insightsData],
  );

  const { data: snapshotData, isFetching: snapLoading } = useQuery({
    ...hakimSnapshotQueryOptions(Boolean(userId) && open, 30),
  });
  const snapshot: Snapshot | null = (snapshotData ?? null) as Snapshot | null;

  const top = insights[0];
  const highSeverity = insights.some(
    (i) => i.severity === "warning" || i.severity === "critical",
  );

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function dismiss(id: string) {
    // optimistic update
    qc.setQueryData<InsightRow[]>(
      userKeys.hakimInsights(activeWorkspaceId ?? null),
      (prev) => (prev ?? []).filter((i) => i.id !== id),
    );
    try {
      await markHakimInsightReadFn({ data: { id } });
    } catch (e) {
      Tracer.error("hakim", "hakim_insight_dismiss_error", { args: ["hakim insight dismiss error", e] });
    } finally {
      void qc.invalidateQueries({
        queryKey: userKeys.hakimInsights(activeWorkspaceId ?? null),
      });
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const { reply } = await chatHakimFn({
        data: { message: text, scope: workspace, snapshot },
      });
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "تعذّر الوصول إلى حكيم الآن." },
      ]);
    } finally {
      setSending(false);
    }
  }

  // PROGRESSIVE DISCLOSURE — render nothing if no unread insights
  const visible = userId && insights.length > 0;
  if (!visible) return null;

  const pillTone = highSeverity
    ? "ring-2 ring-destructive/60"
    : "ring-1 ring-border/60";

  const pill = (
    <Button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="حكيم — رؤية ذكية جديدة"
      className={`group inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-foreground shadow-sm transition active:scale-95 ${pillTone}`}
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="text-[11px] font-bold tracking-wide">حكيم</span>
      {highSeverity && (
        <AlertTriangle className="h-3 w-3 text-destructive" aria-hidden />
      )}
      <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-primary/10 px-1 text-[10px] font-bold tabular-nums text-primary">
        {insights.length}
      </span>
    </Button>
  );

  const sheet = (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" className="max-h-[85vh] flex flex-col gap-3">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            حكيم — المرشد المالي
          </SheetTitle>
        </SheetHeader>

        {/* Top insight */}
        {top && (
          <div className="rounded-2xl bg-muted/50 ring-1 ring-border/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {top.severity === "critical"
                    ? "تنبيه حرج"
                    : top.severity === "warning"
                      ? "تحذير"
                      : top.severity === "advisory"
                        ? "نصيحة"
                        : "ملاحظة"}
                </p>
                <h3 className="mt-0.5 text-sm font-bold text-foreground truncate">
                  {top.title}
                </h3>
                {top.summary && (
                  <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    {top.summary}
                  </p>
                )}
              </div>
              <Button
                type="button"
                onClick={() => dismiss(top.id)}
                aria-label="إغلاق"
                className="grid h-7 w-7 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-border/60 active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Snapshot */}
        <div className="grid grid-cols-3 gap-2">
          <SnapTile label="رصيد" value={fmt(snapshot?.balance)} loading={snapLoading} />
          <SnapTile label="دخل ٣٠ يوم" value={fmt(snapshot?.income)} loading={snapLoading} />
          <SnapTile label="مصروف ٣٠ يوم" value={fmt(snapshot?.expense)} loading={snapLoading} />
        </div>

        {snapshot?.top_categories && snapshot.top_categories.length > 0 && (
          <div className="rounded-2xl bg-card ring-1 ring-border/60 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              أعلى الفئات
            </p>
            <ul className="space-y-1.5">
              {snapshot.top_categories.slice(0, 5).map((c) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="text-foreground">{c.category}</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {fmt(c.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Chat */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-[120px] overflow-y-auto rounded-2xl bg-muted/30 ring-1 ring-border/60 p-3 space-y-2"
        >
          {messages.length === 0 ? (
            <p className="text-[12px] text-muted-foreground text-center pt-6">
              اسأل حكيم عن أي شيء يخص مالك.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-card text-foreground ring-1 ring-border/60"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
          {sending && (
            <div className="mr-auto inline-flex items-center gap-2 rounded-2xl bg-card text-foreground ring-1 ring-border/60 px-3 py-2 text-[12px]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> يفكّر…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل حكيم…"
            className="flex-1 rounded-full bg-card text-foreground placeholder:text-muted-foreground ring-1 ring-border/60 px-4 py-2 text-[13px] outline-none focus:ring-primary"
          />
          <Button
            type="submit"
            disabled={!input.trim() || sending}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-95 disabled:opacity-40"
            aria-label="إرسال"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );

  if (inline) {
    return (
      <>
        {pill}
        {sheet}
      </>
    );
  }

  // Default: floating in bottom-right (above bottom-nav)
  return (
    <>
      <div className="fixed bottom-24 end-4 z-40">{pill}</div>
      {sheet}
    </>
  );
}

function SnapTile({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border/60 p-2.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-[14px] font-bold tabular-nums text-foreground">
        {loading ? "…" : value}
      </p>
    </div>
  );
}
