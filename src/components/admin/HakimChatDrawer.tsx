import { useEffect, useRef, useState } from "react";
import { X, Send, Sparkles, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useHakimChatStream } from "@/hooks/useHakimChatStream";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export function HakimChatDrawer({
  open, onClose, contextLabel, contextData,
}: {
  open: boolean;
  onClose: () => void;
  contextLabel?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextData?: Record<string, any>;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { streaming, send: streamSend } = useHakimChatStream();

  useEffect(() => {
    if (open && messages.length === 0 && contextData) {
      setMessages([{
        role: "assistant",
        content: `السلام عليكم 👋 — أنا حكيم. أمامي **${contextLabel ?? "أرقام الشاشة الحالية"}**. اسألني عن أي رقم أو خطة تحسين.`,
      }]);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    const ctxLine = contextData
      ? `[سياق الشاشة (${contextLabel ?? "data"}): ${JSON.stringify(contextData)}]\n\n`
      : "";

    await streamSend(
      { session_id: sessionId, message: ctxLine + text, period_from: null, period_to: null },
      {
        onChunk: (acc) => {
          setMessages((m) => {
            const next = [...m];
            next[next.length - 1] = { role: "assistant", content: acc };
            return next;
          });
        },
        onSession: (sid) => setSessionId(sid),
        onError: (code) => {
          if (code === "rate_limited") toast.error("الطلبات كثيرة، حاول بعد دقيقة.");
          else if (code === "payment_required") toast.error("نفد رصيد الذكاء الاصطناعي.");
          else toast.error("تعذر الاتصال بحكيم");
        },
      },
    );
  };

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-background border-l border-border shadow-2xl flex flex-col transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-l from-primary/5 to-[hsl(var(--purple))]/5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--purple))] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-[15px] leading-tight">حكيم</p>
              <p className="text-[10.5px] text-foreground-tertiary">المستشار المالي الذكي</p>
            </div>
          </div>
          <Button onClick={onClose} className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center press">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-surface border border-border/40 rounded-bl-md prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-headings:font-display prose-strong:text-foreground",
                )}
              >
                {m.role === "assistant"
                  ? <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  : <span>{m.content}</span>}
              </div>
            </div>
          ))}
        </div>

        <footer className="border-t border-border/50 p-3 bg-surface">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="اسأل حكيم عن أي رقم في الشاشة…"
              rows={1}
              className="flex-1 resize-none bg-background border border-border/50 rounded-2xl px-4 py-2.5 text-[13.5px] outline-none focus:border-primary/50 max-h-32"
            />
            <Button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm disabled:opacity-50 press"
            >
              {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
