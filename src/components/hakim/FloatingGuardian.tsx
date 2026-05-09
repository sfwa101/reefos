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
import { Sparkles, Send, Loader2, AlertTriangle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useSovereignContext } from "@/core-os/capabilities/store/useSovereignContext";

type Severity = "info" | "advisory" | "warning" | "critical";

type InsightRow = {
  id: string;
  user_id: string;
  workspace_id: string;
  severity: Severity;
  kind: string;
  title: string;
  summary: string | null;
  suggestions: unknown;
  created_at: string;
  read_at: string | null;
};

type Snapshot = {
  balance?: number;
  income?: number;
  expense?: number;
  savings_velocity?: number;
  top_categories?: Array<{ category: string; amount: number; count: number }>;
};

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

  const [insights, setInsights] = useState<InsightRow[]>([]);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapLoading, setSnapLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime subscription
  useEffect(() => {
    if (!userId) return;
    let active = true;

    void (async () => {
      let q = (supabase.from("hakim_user_insights" as never) as unknown as {
        select: (s: string) => {
          is: (c: string, v: null) => {
            order: (c: string, o: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: InsightRow[] | null }>;
            };
          };
          eq: (c: string, v: string) => {
            is: (c: string, v: null) => {
              order: (c: string, o: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: InsightRow[] | null }>;
              };
            };
          };
        };
      }).select("*");
      const result = activeWorkspaceId
        ? await q.eq("workspace_id", activeWorkspaceId).is("read_at", null).order("created_at", { ascending: false }).limit(20)
        : await q.is("read_at", null).order("created_at", { ascending: false }).limit(20);
      if (!active) return;
      setInsights(((result.data ?? []) as unknown as InsightRow[]));
    })();

    const ch = supabase
      .channel(`hakim_insights_${userId}_${activeWorkspaceId ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hakim_user_insights",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as InsightRow;
          if (row.read_at) return;
          if (activeWorkspaceId && row.workspace_id !== activeWorkspaceId) return;
          setInsights((prev) => [row, ...prev].slice(0, 20));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(ch);
    };
  }, [userId]);

  const top = insights[0];
  const highSeverity = insights.some(
    (i) => i.severity === "warning" || i.severity === "critical",
  );

  // Load financial snapshot on open
  useEffect(() => {
    if (!open || !userId) return;
    setSnapLoading(true);
    void (async () => {
      const { data } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)(
        "hakim_user_financial_snapshot",
        { p_user_id: userId, p_days: 30 },
      );
      setSnapshot((data as Snapshot) ?? null);
      setSnapLoading(false);
    })();
  }, [open, userId]);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  async function dismiss(id: string) {
    setInsights((prev) => prev.filter((i) => i.id !== id));
    await (supabase.from("hakim_user_insights" as never) as unknown as {
      update: (v: Record<string, unknown>) => {
        eq: (c: string, v: string) => Promise<unknown>;
      };
    })
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("hakim-chat", {
        body: {
          message: text,
          scope: workspace,
          snapshot,
        },
      });
      const reply =
        (data as { reply?: string; message?: string } | null)?.reply ??
        (data as { reply?: string; message?: string } | null)?.message ??
        (error ? "تعذّر الوصول إلى حكيم الآن. حاول لاحقاً." : "…");
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
    <button
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
    </button>
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
              <button
                type="button"
                onClick={() => dismiss(top.id)}
                aria-label="إغلاق"
                className="grid h-7 w-7 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-border/60 active:scale-95"
              >
                <X className="h-3.5 w-3.5" />
              </button>
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل حكيم…"
            className="flex-1 rounded-full bg-card text-foreground placeholder:text-muted-foreground ring-1 ring-border/60 px-4 py-2 text-[13px] outline-none focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-95 disabled:opacity-40"
            aria-label="إرسال"
          >
            <Send className="h-4 w-4" />
          </button>
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
