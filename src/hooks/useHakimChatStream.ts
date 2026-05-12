// Hakim Chat streaming hook. Encapsulates the bearer-token retrieval and SSE
// streaming from the hakim-chat edge function so admin pages don't import the
// raw Supabase client directly (Article 5 — Layered Architecture).
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HakimStreamMessage = { role: "user" | "assistant"; content: string };

export type HakimStreamRequest = {
  session_id: string | null;
  message: string;
  period_from: string | null;
  period_to: string | null;
};

export type HakimStreamCallbacks = {
  onChunk: (assistantSoFar: string) => void;
  onSession: (sid: string) => void;
  onError: (code: "rate_limited" | "payment_required" | "stream_failed") => void;
};

export function useHakimChatStream() {
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (req: HakimStreamRequest, cb: HakimStreamCallbacks) => {
    if (streaming) return;
    setStreaming(true);
    const ctl = new AbortController();
    abortRef.current = ctl;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hakim-chat`;
      const resp = await fetch(url, {
        method: "POST",
        signal: ctl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify(req),
      });

      if (resp.status === 429) { cb.onError("rate_limited"); return; }
      if (resp.status === 402) { cb.onError("payment_required"); return; }
      if (!resp.ok || !resp.body) { cb.onError("stream_failed"); return; }

      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let assistantSoFar = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const p = JSON.parse(json);
            if (p.meta?.session_id) { cb.onSession(p.meta.session_id); continue; }
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              assistantSoFar += c;
              cb.onChunk(assistantSoFar);
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch {
      cb.onError("stream_failed");
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming]);

  return { streaming, send };
}
