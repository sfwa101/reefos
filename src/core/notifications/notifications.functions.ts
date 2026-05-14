// Notifications Gateway — Wave R-2 · Batch A.2.
// Admin-only notification meta queries (e.g. unread count for the topbar).
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SbAny = any;

export const countUnreadNotificationsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ unread: number }> => {
    const sb = context.supabase as SbAny;
    const { count, error } = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    if (error) return { unread: 0 };
    return { unread: typeof count === "number" ? count : 0 };
  });
