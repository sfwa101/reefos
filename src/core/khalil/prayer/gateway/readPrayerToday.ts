/**
 * Khalil — Prayer read gateway (P2.2).
 *
 * Only sanctioned read path for prayer logs scoped to a single local
 * date. RLS scopes rows to the caller; server-fn middleware enforces
 * `khalil.prayer.log.read`.
 *
 * Thin by design (see logPrayer.ts header).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  readPrayerTodayInputSchema,
  type PrayerLogRow,
  type PrayerMode,
  type PrayerName,
} from "../schemas";

export const readPrayerTodayFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => readPrayerTodayInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: rows, error } = await supabase
      .from("khalil_prayer_log")
      .select("id,prayer,mode,logged_for_date,occurred_at")
      .eq("logged_for_date", data.date)
      .order("occurred_at", { ascending: true });

    if (error) {
      throw new Error(`khalil_prayer_log_read_failed: ${error.message}`);
    }

    const projected: PrayerLogRow[] = (rows ?? []).map((r) => ({
      id: r.id as string,
      prayer: r.prayer as PrayerName,
      mode: r.mode as PrayerMode,
      loggedForDate: r.logged_for_date as string,
      occurredAt: r.occurred_at as string,
    }));

    return { date: data.date, rows: projected };
  });
