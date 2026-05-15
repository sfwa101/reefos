/**
 * HakimSidePanel — Steel Glass side panel wired to the sovereign AI engine.
 *
 * Uses `useHakimChatStream` (which talks to HakimGateway → /api/hakim-chat)
 * for real bidirectional streaming. Zero supabase.from() calls in the UI.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useHakimChatStream } from "@/hooks/useHakimChatStream";
import { cn } from "@/lib/utils";

import { useHakimLayer } from "./useHakimLayer";

type Msg = { role: "user" | "assistant"; content: string };

export function HakimSidePanel() {
  const mode = useHakimLayer((s) => s.mode);
  const close = useHakimLayer((s) => s.close);
  const open = mode === "panel";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { streaming, send: streamSend } = useHakimChatStream();

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content:
            "السلام عليكم 👋 — أنا **حكيم**، المستشار السيادي. اسألني عن أرقام اليوم، أو طلب تحسين خطة.",
        },
      ]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    await streamSend(
      { session_id: sessionId, message: text, period_from: null, period_to: null },
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
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="hakim-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm"
          />

          <motion.aside
            key="hakim-panel"
            initial={{ x: "-100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0.4 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed inset-y-0 left-0 z-[80] flex w-full max-w-[460px] flex-col glass-steel-strong border-r border-white/40 shadow-elevated"
            dir="rtl"
            role="dialog"
            aria-label="مساعد حكيم"
          >
            <header className="flex items-center justify-between border-b border-white/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent text-primary-foreground shadow-elevated">
                  <Sparkles className="h-5 w-5" strokeWidth={2.4} />
                </div>
                <div>
                  <p className="font-display text-[15px] font-extrabold leading-none">حكيم</p>
                  <p className="text-[10.5px] font-bold text-muted-foreground">
                    المستشار السيادي · متصل
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={close}
                aria-label="إغلاق"
                className="h-9 w-9 rounded-2xl hover:bg-white/40"
              >
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex w-full",
                    m.role === "user" ? "justify-start" : "justify-end",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-steel-soft",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "glass-steel border border-white/40",
                    )}
                  >
                    {m.role === "assistant" && !m.content && streaming ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <div className="prose prose-sm max-w-none rtl:prose-headings:text-right">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send();
              }}
              className="border-t border-white/30 p-3"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-white/40 bg-white/40 p-2 backdrop-blur-md focus-within:ring-2 focus-within:ring-primary/30">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  placeholder="اكتب سؤالك لحكيم…"
                  disabled={streaming}
                  aria-label="رسالة لحكيم"
                  className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] font-medium outline-none placeholder:text-muted-foreground/70 disabled:opacity-60"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || streaming}
                  aria-label="إرسال"
                  className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-elevated"
                >
                  {streaming ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
                Enter للإرسال · Shift+Enter لسطر جديد
              </p>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
