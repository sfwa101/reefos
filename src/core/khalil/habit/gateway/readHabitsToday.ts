/**
 * Khalil — Habit read gateway (P2.3).
 *
 * Returns active definitions for the caller + that day's completions.
 * RLS scopes rows; the server-fn middleware enforces the cap key.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import {
  readHabitsTodayInputSchema,
  type HabitCompletionRow,
  type HabitDefinitionRow,
} from "../schemas";

export const readHabitsTodayFn = createServerFn({ method: "GET" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.HABIT_READ),
  ])
  .inputValidator((input) => readHabitsTodayInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const [{ data: defs, error: defErr }, { data: comps, error: compErr }] =
      await Promise.all([
        supabase
          .from("khalil_habit_definition")
          .select("id,slug,name_key,cadence,target_per_day,created_at,archived_at")
          .order("created_at", { ascending: true }),
        supabase
          .from("khalil_habit_completion")
          .select("id,habit_id,date,partial,mode,created_at")
          .eq("date", data.date),
      ]);

    if (defErr) throw new Error(`khalil_habit_defs_read_failed: ${defErr.message}`);
    if (compErr) throw new Error(`khalil_habit_comps_read_failed: ${compErr.message}`);

    const definitions: HabitDefinitionRow[] = (defs ?? []).map((r) => ({
      id: r.id as string,
      slug: r.slug as string,
      nameKey: r.name_key as string,
      cadence: r.cadence as HabitDefinitionRow["cadence"],
      targetPerDay: r.target_per_day as number,
      createdAt: r.created_at as string,
      archivedAt: (r.archived_at as string | null) ?? null,
    }));

    const completions: HabitCompletionRow[] = (comps ?? []).map((r) => ({
      id: r.id as string,
      habitId: r.habit_id as string,
      date: r.date as string,
      partial: Number(r.partial),
      mode: r.mode as HabitCompletionRow["mode"],
      createdAt: r.created_at as string,
    }));

    return { date: data.date, definitions, completions };
  });
