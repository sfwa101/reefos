import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, Link } from "@tanstack/react-router";
import { Sparkles, X, Send, Loader2, Maximize2 } from "lucide-react";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { useHakimChatStream } from "@/hooks/useHakimChatStream";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Omnipresent floating Hakim chat. Aware of the current admin route,
 * so it can answer "what's on this page?" style questions.
 */
export function HakimFAB() {
  const { hasRole, loading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { streaming, send: streamSend } = useHakimChatStream();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const contextHint = (() => {
    if (pathname === "/admin") return "اللوحة الرئيسية";
    if (pathname.startsWith("/admin/orders")) return "صفحة الطلبات";
    if (pathname.startsWith("/admin/assets")) return "بوابة الأصول العالمية";
    if (pathname.startsWith("/admin/customers")) return "صفحة العملاء";
    if (pathname.startsWith("/admin/inventory")) return "صفحة المخزون";
    if (pathname.startsWith("/admin/finance")) return "التقارير المالية";
    if (pathname.startsWith("/admin/cfo")) return "الرؤية المالية CFO";
    return "لوحة الإدارة";
  })();

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    setInput("");
    const contextual = `[سياق المستخدم: ${contextHint} — ${pathname}]\n\n${message}`;
    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);

    let failed = false;
    await streamSend(
      { session_id: sessionId, message: contextual, period_from: null, period_to: null },
      {
        onChunk: (assistantSoFar) => {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
            return copy;
          });
        },
        onSession: (sid) => setSessionId(sid),
        onError: (code) => {
          failed = true;
          if (code === "rate_limited") toast.error("تم تجاوز الحد، حاول لاحقاً");
          else if (code === "payment_required") toast.error("الرصيد منتهٍ");
          else toast.error("فشل الاتصال بحكيم");
        },
      },
    );

    if (failed) {
      setMessages((m) => m.slice(0, -2));
    }
  };

  if (loading || !allowed) return null;

  const suggestions = [
    `حلّل ${contextHint} الآن`,
    "ما أعلى 3 أولويات اليوم؟",
    "أين تتسرب الأرباح؟",
  ];

  return (
    <>
      {/* FAB */}
      <Button
        onClick={() => setOpen(true)}
        aria-label="افتح حكيم"
        className={cn(
          "fixed z-50 bottom-32 lg:bottom-6 left-4 lg:left-6",
          "h-14 w-14 rounded-full",
          "bg-gradient-to-br from-[hsl(var(--purple))] via-[hsl(var(--indigo))] to-[hsl(var(--info))]",
          "text-white shadow-[0_10px_40px_-8px_hsl(var(--purple)/0.6)]",
          "flex items-center justify-center",
          "hover:scale-105 active:scale-95 transition-transform",
          "ring-4 ring-background"
        )}
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-success ring-2 ring-background animate-pulse" />
      </Button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[60]" dir="rtl">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 lg:inset-x-auto lg:left-6 lg:bottom-6 lg:w-[420px] lg:max-h-[80vh] h-[85vh] lg:rounded-3xl rounded-t-3xl bg-card border border-border/60 shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-gradient-to-br from-[hsl(var(--purple))] via-[hsl(var(--indigo))] to-[hsl(var(--info))] p-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-[16px] leading-tight">حكيم</p>
                  <p className="text-[10.5px] opacity-80">يرافقك في {contextHint}</p>
                </div>
                <Link to="/admin/hakim-chat" className="h-8 w-8 rounded-lg hover:bg-white/15 flex items-center justify-center" onClick={() => setOpen(false)}>
                  <Maximize2 className="h-4 w-4" />
                </Link>
                <Button onClick={() => setOpen(false)} className="h-8 w-8 rounded-lg hover:bg-white/15 flex items-center justify-center">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              {messages.length === 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[12px] text-foreground-tertiary text-center mb-3">اسألني أي شيء عن الصفحة الحالية</p>
                  {suggestions.map((s) => (
                    <Button key={s} onClick={() => send(s)}
                      className="w-full text-right p-2.5 rounded-xl bg-surface-muted hover:bg-muted text-[12px] transition press">
                      {s}
                    </Button>
                  ))}
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[88%] rounded-2xl p-2.5 text-[12.5px] leading-relaxed ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-muted"}`}>
                    {m.role === "assistant" && !m.content && streaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <div className="prose prose-sm max-w-none [&_p]:my-1 [&_h2]:font-display [&_h2]:text-[13px] [&_h2]:mt-2 [&_h2]:mb-1 [&_strong]:text-primary [&_ul]:my-1 [&_li]:my-0.5">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/40 p-2">
              <div className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                  placeholder="اسأل حكيم..."
                  disabled={streaming}
                  className="flex-1 bg-surface-muted rounded-xl h-10 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
                <Button onClick={() => send()} disabled={streaming || !input.trim()}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 flex items-center">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
