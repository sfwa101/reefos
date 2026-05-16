/**
 * Khalil — Coach propose gateway (P2.6 §8A).
 *
 * Server-only path that:
 *   1. Builds the allowlisted snapshot from server-truth tables.
 *   2. Renders a deterministic prompt (prompts.server.ts).
 *   3. Calls the AI gateway (Lovable AI Gateway — the Salsabil bridge).
 *   4. Strict-validates the response. Any deviation falls back to the
 *      deterministic quiet-day proposal (§11).
 *   5. Persists the proposal append-only and returns a DTO.
 *
 * UI never sees model output. UI never decides what proposal to render.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireKhalilCapability } from "../../middleware/requireKhalilCapability";
import { KHALIL_CAP } from "../../capabilities";
import {
  buildCoachPrompt,
  ALLOWED_COPY_KEYS,
  PROMPT_VERSION,
} from "../runtime/prompts.server";
import { validateCoachProposalDraft } from "../runtime/schema";
import { buildQuietDayFallback } from "../runtime/fallback";
import type { CoachSnapshot } from "../runtime/snapshot";
import type {
  CoachProposalDraft,
  CoachProposalDTO,
  CoachProposalKind,
} from "../schemas";
import type { RecoveryMode } from "../../recovery/schemas";
import type { KhalilIdentityLevel } from "../../identity/runtime/config";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAiGateway(
  system: string,
  user: string,
): Promise<unknown | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function withSafeCopyKey(draft: CoachProposalDraft): CoachProposalDraft {
  // Defence-in-depth: even when the schema passes, restrict copy keys
  // to the allowlist. Anything outside falls back to quiet-day.
  if (!ALLOWED_COPY_KEYS.has(draft.copyKey)) return buildQuietDayFallback();
  if (!ALLOWED_COPY_KEYS.has(draft.payload.copyKey)) return buildQuietDayFallback();
  return draft;
}

export const proposeCoachFn = createServerFn({ method: "POST" })
  .middleware([
    requireSupabaseAuth,
    requireKhalilCapability(KHALIL_CAP.COACH_PROPOSE_READ),
  ])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const localDate = now.toISOString().slice(0, 10);

    // 1. Look for a still-valid pending proposal — return it instead of
    //    spinning up another call (deterministic, idempotent).
    const { data: existing } = await supabase
      .from("khalil_coach_proposal")
      .select(
        "id,kind,status,copy_key,payload,suggested_capability,prompt_version,created_at,expires_at,accepted_at,dismissed_at",
      )
      .eq("user_id", userId)
      .eq("status", "pending")
      .gt("expires_at", now.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { proposal: rowToDto(existing) };
    }

    // 2. Build server-truth snapshot.
    const [
      { data: recoveryRow },
      { data: identityRow },
      { data: adherenceRow },
      { data: recentRows },
      { data: habitsCount },
    ] = await Promise.all([
      supabase
        .from("khalil_recovery_state")
        .select("current_state")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("khalil_identity_state")
        .select("current_level")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("khalil_adherence_daily")
        .select("combined_score,prayer_score,habit_score")
        .eq("user_id", userId)
        .eq("for_date", localDate)
        .maybeSingle(),
      supabase
        .from("khalil_coach_proposal")
        .select("kind")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("khalil_habit_definition")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("archived_at", null),
    ]);

    const recovery: RecoveryMode =
      (recoveryRow?.current_state as RecoveryMode | undefined) ?? "off";
    const identityLevel: KhalilIdentityLevel =
      (identityRow?.current_level as KhalilIdentityLevel | undefined) ?? "seed";

    const snapshot: CoachSnapshot = {
      userId,
      localDate,
      identityLevel,
      recovery,
      adherence: {
        combinedScore: Number(adherenceRow?.combined_score ?? 0),
        prayerScore: Number(adherenceRow?.prayer_score ?? 0),
        habitScore: Number(adherenceRow?.habit_score ?? 0),
      },
      activePillars: [
        "prayer",
        ...(((habitsCount as unknown as { count?: number } | null)?.count ?? 0) > 0
          ? (["habit"] as const)
          : []),
        ...(recovery !== "off" ? (["recovery"] as const) : []),
      ],
      recentProposalKinds: (recentRows ?? []).map(
        (r) => r.kind as CoachProposalKind,
      ),
    };

    // 3. Call AI gateway. 4. Validate. 5. Fallback on any failure.
    const built = buildCoachPrompt(snapshot);
    const raw = await callAiGateway(built.system, built.user);
    const verdict = raw ? validateCoachProposalDraft(raw) : null;
    const draft: CoachProposalDraft = verdict?.ok
      ? withSafeCopyKey({ ...verdict.draft, promptVersion: PROMPT_VERSION })
      : buildQuietDayFallback();

    const expiresAt = new Date(now.getTime() + draft.ttlSeconds * 1000);

    const { data: inserted, error: insErr } = await supabase
      .from("khalil_coach_proposal")
      .insert({
        user_id: userId,
        kind: draft.kind,
        status: "pending",
        copy_key: draft.copyKey,
        payload: draft.payload,
        suggested_capability: draft.suggestedCapability ?? null,
        prompt_version: draft.promptVersion,
        expires_at: expiresAt.toISOString(),
      })
      .select(
        "id,kind,status,copy_key,payload,suggested_capability,prompt_version,created_at,expires_at,accepted_at,dismissed_at",
      )
      .single();

    if (insErr || !inserted) {
      throw new Error(`khalil_coach_proposal_insert_failed: ${insErr?.message}`);
    }

    await supabase.from("khalil_coach_audit").insert({
      proposal_id: inserted.id,
      user_id: userId,
      action: "proposed",
      meta: { source: verdict?.ok ? "model" : "fallback" },
    });

    return { proposal: rowToDto(inserted) };
  });

function rowToDto(row: {
  id: string;
  kind: string;
  status: string;
  copy_key: string;
  payload: unknown;
  suggested_capability: string | null;
  prompt_version: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
  dismissed_at: string | null;
}): CoachProposalDTO {
  return {
    id: row.id,
    kind: row.kind as CoachProposalDTO["kind"],
    status: row.status as CoachProposalDTO["status"],
    copyKey: row.copy_key,
    payload: row.payload as CoachProposalDTO["payload"],
    suggestedCapability:
      (row.suggested_capability as CoachProposalDTO["suggestedCapability"]) ?? null,
    promptVersion: row.prompt_version,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    dismissedAt: row.dismissed_at,
  };
}
