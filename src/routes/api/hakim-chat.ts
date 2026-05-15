// Hakim Chat — SSE streaming server route (Wave P-4.2).
// Replaces the legacy `hakim-chat` Supabase Edge Function. Validates the
// caller's bearer token via the Supabase publishable client, then delegates
// to `prepareHakimChatStream` for the AI gateway pipe + persistence.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  prepareHakimChatStream,
  type HakimChatStreamRequest,
} from "@/core/hakim-ai/hakim.server";
import { asDynamic } from "@/integrations/supabase/dynamic";
import { Tracer } from "@/core/system/observability/Tracer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
} as const;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/hakim-chat")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),

      POST: async ({ request }) => {
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const PUBLISHABLE_KEY =
            process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
          if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
            return json({ error: "server_misconfigured" }, 500);
          }

          const authHeader = request.headers.get("authorization") ?? "";
          if (!authHeader.startsWith("Bearer ")) {
            return json({ error: "unauthorized" }, 401);
          }

          const userClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const body = (await request.json().catch(() => ({}))) as HakimChatStreamRequest;
          const prep = await prepareHakimChatStream(body, userClient);

          if (!prep.ok) {
            return json(
              { error: prep.error, ...(prep.sid ? { session_id: prep.sid } : {}) },
              prep.status,
            );
          }

          const { sid, aiBody, admin } = prep;
          let fullText = "";
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              const reader = aiBody.getReader();
              const decoder = new TextDecoder();
              const enc = new TextEncoder();
              let buf = "";

              controller.enqueue(
                enc.encode(`data: ${JSON.stringify({ meta: { session_id: sid } })}\n\n`),
              );

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  buf += decoder.decode(value, { stream: true });
                  let idx;
                  while ((idx = buf.indexOf("\n")) !== -1) {
                    const line = buf.slice(0, idx).replace(/\r$/, "");
                    buf = buf.slice(idx + 1);
                    if (!line.startsWith("data: ")) {
                      controller.enqueue(enc.encode(line + "\n"));
                      continue;
                    }
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") {
                      controller.enqueue(enc.encode("data: [DONE]\n\n"));
                      continue;
                    }
                    try {
                      const p = JSON.parse(payload) as {
                        choices?: Array<{ delta?: { content?: string } }>;
                      };
                      const c = p.choices?.[0]?.delta?.content;
                      if (c) fullText += c;
                    } catch {
                      /* noop */
                    }
                    controller.enqueue(enc.encode(line + "\n\n"));
                  }
                }
              } finally {
                if (fullText) {
                  const adminDyn = asDynamic(admin);
                  await adminDyn
                    .from("hakim_chat_messages")
                    .insert({ session_id: sid, role: "assistant", content: fullText });
                  await adminDyn
                    .from("hakim_chat_sessions")
                    .update({ updated_at: new Date().toISOString() })
                    .eq("id", sid);
                }
                controller.close();
              }
            },
          });

          return new Response(stream, {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
            },
          });
        } catch (e) {
          Tracer.error("routes", "hakim_chat_route_error", { args: ["hakim-chat route error", e] });
          return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
        }
      },
    },
  },
});
