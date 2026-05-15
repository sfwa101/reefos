import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { MobileTopbar } from "@/components/admin/MobileTopbar";
import { useAdminRoles } from "@/components/admin/RoleGuard";
import { listHakimSessionsFn, listHakimMessagesFn, type HakimSessionRow, type HakimMessageRow } from "@/core/hakim-ai/hakim-chat.functions";
import { useHakimChatStream } from "@/hooks/useHakimChatStream";
import { Loader2, ShieldAlert, Sparkles, Send, Calendar, Plus, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { HakimPulseMonitor } from "@/core/hakim-ai/components/HakimPulseMonitor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string; id?: string };
type Session = HakimSessionRow;

export default function HakimChat() {
  const { hasRole, loading: rolesLoading } = useAdminRoles();
  const allowed = hasRole("admin") || hasRole("finance") || hasRole("store_manager");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const { streaming, send: streamSend } = useHakimChatStream();
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try { setSessions(await listHakimSessionsFn()); } catch { setSessions([]); }
  };

  const loadMessages = async (sid: string) => {
    try {
      const rows = await listHakimMessagesFn({ data: { session_id: sid } });
      setMessages(rows as HakimMessageRow[] as Msg[]);
      setSessionId(sid);
    } catch {
      setMessages([]);
      setSessionId(sid);
    }
  };

  useEffect(() => { if (allowed) loadSessions(); }, [allowed]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }, { role: "assistant", content: "" }]);

    let newSid: string | null = null;
    await streamSend(
      { session_id: sessionId, message, period_from: from || null, period_to: to || null },
      {
        onChunk: (assistantSoFar) => {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: assistantSoFar };
            return copy;
          });
        },
        onSession: (sid) => { newSid = sid; },
        onError: (code) => {
          if (code === "rate_limited") toast.error("تم تجاوز الحد، حاول لاحقاً");
          else if (code === "payment_required") toast.error("الرصيد منتهٍ، أضف مدفوعات");
          else toast.error("فشل الاتصال بحكيم");
          setMessages((m) => m.slice(0, -2));
        },
      },
    );
    if (newSid && newSid !== sessionId) { setSessionId(newSid); loadSessions(); }
  };

  const newSession = () => { setSessionId(null); setMessages([]); };

  if (rolesLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!allowed) return (<><MobileTopbar title="حكيم" /><div className="p-8 text-center" dir="rtl"><ShieldAlert className="h-12 w-12 mx-auto text-foreground-tertiary mb-3" /><p>غير متاح</p></div></>);

  const suggestions = [
    "أعطني تقريراً شاملاً عن أداء المتجر اليوم",
    "حلّل أداء كل قسم وأين الضعف وأين القوة",
    "ما خطتك لمضاعفة المبيعات هذا الشهر؟",
    "راجع المعاملات وحدد أي شبهة ربا، واحسب الزكاة المستحقة",
  ];

  return (
    <>
      <MobileTopbar title="المستشار حكيم" />
      <div className="flex h-[calc(100vh-56px)] lg:h-[calc(100vh-64px)]" dir="rtl">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-64 flex-col bg-surface-muted/40 border-l border-border/40 p-3">
          <Button onClick={newSession} className="bg-primary text-primary-foreground rounded-lg h-9 text-[13px] flex items-center justify-center gap-1 mb-3">
            <Plus className="h-4 w-4" /> محادثة جديدة
          </Button>
          <p className="text-[10px] text-foreground-tertiary mb-1.5">السجل</p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {sessions.map((s) => (
              <Button key={s.id} onClick={() => loadMessages(s.id)}
                className={`w-full text-right p-2 rounded-lg text-[12px] truncate ${sessionId === s.id ? "bg-primary/15 text-primary" : "hover:bg-surface-muted"}`}>
                <MessageCircle className="h-3 w-3 inline ml-1" />
                {s.title || "بدون عنوان"}
              </Button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="px-3 py-2 border-b border-border/40 flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-foreground-tertiary" />
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="bg-surface-muted rounded-lg h-8 px-2 text-[11px]" />
            <span className="text-[11px] text-foreground-tertiary">إلى</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="bg-surface-muted rounded-lg h-8 px-2 text-[11px]" />
            <Button onClick={newSession} className="lg:hidden ml-auto text-[11px] text-primary flex items-center gap-1">
              <Plus className="h-3 w-3" /> جديد
            </Button>
          </div>

          {/* Phase 13 — Hakim Pulse Monitor (local-first heartbeat) */}
          <div className="px-3 pt-3">
            <HakimPulseMonitor />
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="max-w-md mx-auto text-center py-8">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary-glow mx-auto flex items-center justify-center text-primary-foreground mb-3">
                  <Sparkles className="h-7 w-7" />
                </div>
                <p className="font-display text-[16px] mb-1">مرحباً، أنا حكيم</p>
                <p className="text-[12px] text-foreground-tertiary mb-4">مستشارك المالي والشرعي. اسألني عن الأداء، الأرباح، الزكاة، أو أي شبهة.</p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <Button key={s} onClick={() => send(s)}
                      className="w-full text-right p-2.5 rounded-xl bg-surface-muted hover:bg-surface-muted/80 text-[12px]">
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-3 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-surface-muted"}`}>
                  {m.role === "assistant" && !m.content && streaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="prose prose-sm max-w-none text-[13px] leading-relaxed [&_h2]:font-display [&_h2]:text-[14px] [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:font-display [&_h3]:text-[13px] [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-primary [&_p]:my-1">
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
                className="flex-1 bg-surface-muted rounded-xl h-11 px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60" />
              <Button onClick={() => send()} disabled={streaming || !input.trim()}
                className="h-11 px-4 rounded-xl bg-primary text-primary-foreground flex items-center gap-1 disabled:opacity-50">
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
