// Hakim Chat Gateway — Wave R-1 · Batch 6.
// Admin-only handlers for hakim chat sessions and messages.
import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HakimSessionRow = { id: string; title: string | null; updated_at: string };
export type HakimMessageRow = { id: string; role: "user" | "assistant"; content: string };

export const listHakimSessionsFn = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async ({ context }): Promise<HakimSessionRow[]> => {
    const sb = context.supabase as SbAny;
    const { data, error } = await sb
      .from("hakim_chat_sessions")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []) as HakimSessionRow[];
  });

export const listHakimMessagesFn = createServerFn({ method: "GET" })
  .inputValidator((d: { session_id: string }) => {
    const session_id = String(d?.session_id ?? "").trim();
    if (!UUID_RE.test(session_id)) throw new Error("invalid_session_id");
    return { session_id };
  })
  .middleware([requireAdmin])
  .handler(async ({ data, context }): Promise<HakimMessageRow[]> => {
    const sb = context.supabase as SbAny;
    const { data: rows, error } = await sb
      .from("hakim_chat_messages")
      .select("id,role,content")
      .eq("session_id", data.session_id)
      .order("created_at");
    if (error) throw new Error(error.message);
    return (rows ?? []) as HakimMessageRow[];
  });
