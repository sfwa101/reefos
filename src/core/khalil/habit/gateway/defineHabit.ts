/**
 * Khalil — Habit define write gateway (P2.3).
 *
 * Sanctioned write path for `khalil_habit_definition`. UI never touches
 * supabase directly. Enforces:
 *   - requireSupabaseAuth + requireKhalilCapability
 *   - input validation (zod via validateDefineHabit)
 *   - append-only / archive-only mutations (DB trigger backstop)
 *   - slug uniqueness per user
 *
 * Thin by design — only createServerFn + imports — so the Vite splitter
 * keeps server-only modules out of client bundles.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import { defineHabitInputSchema, type HabitDefinitionRow } from "../schemas";

export const defineHabitFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.HABIT_DEFINE_WRITE),
  ])
  .inputValidator((input) => defineHabitInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: inserted, error } = await supabase
      .from("khalil_habit_definition")
      .insert({
        user_id: userId,
        slug: data.slug,
        name_key: data.nameKey,
        cadence: data.cadence,
        target_per_day: data.targetPerDay,
      })
      .select("id,slug,name_key,cadence,target_per_day,created_at,archived_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { status: "duplicate_slug" as const };
      }
      throw new Error(`khalil_habit_definition_insert_failed: ${error.message}`);
    }

    const row: HabitDefinitionRow = {
      id: inserted.id as string,
      slug: inserted.slug as string,
      nameKey: inserted.name_key as string,
      cadence: inserted.cadence as HabitDefinitionRow["cadence"],
      targetPerDay: inserted.target_per_day as number,
      createdAt: inserted.created_at as string,
      archivedAt: (inserted.archived_at as string | null) ?? null,
    };
    return { status: "ok" as const, row };
  });

export const archiveHabitFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.HABIT_ARCHIVE_WRITE),
  ])
  .inputValidator((input: { habitId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("khalil_habit_definition")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", data.habitId)
      .eq("user_id", userId)
      .is("archived_at", null);
    if (error) {
      throw new Error(`khalil_habit_archive_failed: ${error.message}`);
    }
    return { status: "ok" as const };
  });
