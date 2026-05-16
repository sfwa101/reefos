
-- =========================================================================
-- P2.5 — Identity engine (server-attested evolution)
-- =========================================================================

-- 1) Projection table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.khalil_identity_state (
  user_id          UUID PRIMARY KEY,
  current_level    TEXT NOT NULL DEFAULT 'seed',
  current_score    NUMERIC(5,4) NOT NULL DEFAULT 0,
  window_30d       NUMERIC(5,4) NOT NULL DEFAULT 0,
  window_90d       NUMERIC(5,4) NOT NULL DEFAULT 0,
  window_180d      NUMERIC(5,4) NOT NULL DEFAULT 0,
  observed_days    INTEGER NOT NULL DEFAULT 0,
  last_computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT khalil_identity_state_level_chk
    CHECK (current_level IN ('seed','stable','rising','disciplined','sovereign'))
);

ALTER TABLE public.khalil_identity_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS khalil_identity_state_select_own ON public.khalil_identity_state;
CREATE POLICY khalil_identity_state_select_own
  ON public.khalil_identity_state FOR SELECT
  USING (auth.uid() = user_id);

-- 2) Append-only event log -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.khalil_identity_event (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  from_level  TEXT NOT NULL,
  to_level    TEXT NOT NULL,
  score       NUMERIC(5,4) NOT NULL,
  window_30d  NUMERIC(5,4) NOT NULL,
  window_90d  NUMERIC(5,4) NOT NULL,
  window_180d NUMERIC(5,4) NOT NULL,
  reason      TEXT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT khalil_identity_event_levels_chk
    CHECK (from_level IN ('seed','stable','rising','disciplined','sovereign')
       AND to_level   IN ('seed','stable','rising','disciplined','sovereign'))
);

CREATE INDEX IF NOT EXISTS khalil_identity_event_user_idx
  ON public.khalil_identity_event (user_id, created_at DESC);

ALTER TABLE public.khalil_identity_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS khalil_identity_event_select_own ON public.khalil_identity_event;
CREATE POLICY khalil_identity_event_select_own
  ON public.khalil_identity_event FOR SELECT
  USING (auth.uid() = user_id);

-- Immutability: append-only (writes done by SECURITY DEFINER fn only).
CREATE OR REPLACE FUNCTION public.khalil_identity_event_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'khalil_identity_event is append-only';
END;
$$;

DROP TRIGGER IF EXISTS khalil_identity_event_no_update ON public.khalil_identity_event;
CREATE TRIGGER khalil_identity_event_no_update
  BEFORE UPDATE ON public.khalil_identity_event
  FOR EACH ROW EXECUTE FUNCTION public.khalil_identity_event_immutable();

DROP TRIGGER IF EXISTS khalil_identity_event_no_delete ON public.khalil_identity_event;
CREATE TRIGGER khalil_identity_event_no_delete
  BEFORE DELETE ON public.khalil_identity_event
  FOR EACH ROW EXECUTE FUNCTION public.khalil_identity_event_immutable();

-- 3) Extend adherence projection ------------------------------------------
ALTER TABLE public.khalil_adherence_daily
  ADD COLUMN IF NOT EXISTS identity_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS identity_level_snapshot TEXT NULL
    CHECK (identity_level_snapshot IS NULL OR identity_level_snapshot IN
      ('seed','stable','rising','disciplined','sovereign'));

-- 4) Recompute function ----------------------------------------------------
-- Pure, deterministic, owner-scoped via p_user_id. Caller must be that user
-- (gateway enforces) or this is invoked by the trigger below (already scoped
-- to the row's user_id).
CREATE OR REPLACE FUNCTION public.khalil_recompute_identity(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'UTC')::date;
  v_w30   NUMERIC(5,4);
  v_w90   NUMERIC(5,4);
  v_w180  NUMERIC(5,4);
  v_days  INTEGER;
  v_score NUMERIC(5,4);
  v_recovery TEXT;
  v_soften NUMERIC := 1.0;
  v_prev_level TEXT;
  v_new_level TEXT;
BEGIN
  -- Recovery softens: soft = 1.05, hard = 1.15 multiplier on score
  -- (caps at 1.0). Hard alone can never DEMOTE — handled below.
  SELECT current_state INTO v_recovery
  FROM public.khalil_recovery_state WHERE user_id = p_user_id;
  IF v_recovery = 'soft' THEN v_soften := 1.05; END IF;
  IF v_recovery = 'hard' THEN v_soften := 1.15; END IF;

  -- Rolling windows over khalil_adherence_daily (combined_score).
  SELECT COALESCE(AVG(combined_score), 0)::numeric(5,4)
    INTO v_w30
    FROM public.khalil_adherence_daily
   WHERE user_id = p_user_id
     AND for_date > v_today - INTERVAL '30 days'
     AND for_date <= v_today;

  SELECT COALESCE(AVG(combined_score), 0)::numeric(5,4)
    INTO v_w90
    FROM public.khalil_adherence_daily
   WHERE user_id = p_user_id
     AND for_date > v_today - INTERVAL '90 days'
     AND for_date <= v_today;

  SELECT COALESCE(AVG(combined_score), 0)::numeric(5,4)
    INTO v_w180
    FROM public.khalil_adherence_daily
   WHERE user_id = p_user_id
     AND for_date > v_today - INTERVAL '180 days'
     AND for_date <= v_today;

  SELECT COUNT(DISTINCT for_date) INTO v_days
    FROM public.khalil_adherence_daily
   WHERE user_id = p_user_id
     AND combined_score > 0
     AND for_date > v_today - INTERVAL '180 days'
     AND for_date <= v_today;

  -- Weighted score: 30d=0.5, 90d=0.3, 180d=0.2, then soften, capped at 1.
  v_score := LEAST(1.0, ((v_w30 * 0.5) + (v_w90 * 0.3) + (v_w180 * 0.2)) * v_soften)::numeric(5,4);

  -- Resolve current level by thresholds + minimum observation days.
  v_new_level := 'seed';
  IF v_score >= 0.35 AND v_days >= 14 THEN v_new_level := 'stable'; END IF;
  IF v_score >= 0.55 AND v_days >= 30  AND v_w30  >= 0.50 THEN v_new_level := 'rising'; END IF;
  IF v_score >= 0.70 AND v_days >= 60  AND v_w90  >= 0.60 THEN v_new_level := 'disciplined'; END IF;
  IF v_score >= 0.85 AND v_days >= 120 AND v_w180 >= 0.70 THEN v_new_level := 'sovereign'; END IF;

  -- Read previous level.
  SELECT current_level INTO v_prev_level
    FROM public.khalil_identity_state WHERE user_id = p_user_id;
  IF v_prev_level IS NULL THEN v_prev_level := 'seed'; END IF;

  -- Anti-leap: never jump more than one level up at a time.
  IF level_idx(v_new_level) > level_idx(v_prev_level) + 1 THEN
    v_new_level := level_name(level_idx(v_prev_level) + 1);
  END IF;

  -- Hard recovery alone cannot demote.
  IF v_recovery = 'hard' AND level_idx(v_new_level) < level_idx(v_prev_level) THEN
    v_new_level := v_prev_level;
  END IF;

  -- Upsert projection.
  INSERT INTO public.khalil_identity_state AS s
    (user_id, current_level, current_score, window_30d, window_90d, window_180d,
     observed_days, last_computed_at, updated_at)
  VALUES
    (p_user_id, v_new_level, v_score, v_w30, v_w90, v_w180,
     v_days, now(), now())
  ON CONFLICT (user_id) DO UPDATE
    SET current_level    = EXCLUDED.current_level,
        current_score    = EXCLUDED.current_score,
        window_30d       = EXCLUDED.window_30d,
        window_90d       = EXCLUDED.window_90d,
        window_180d      = EXCLUDED.window_180d,
        observed_days    = EXCLUDED.observed_days,
        last_computed_at = now(),
        updated_at       = now();

  -- Stamp identity onto today's adherence row (for analytics replay).
  UPDATE public.khalil_adherence_daily
     SET identity_score = v_score,
         identity_level_snapshot = v_new_level
   WHERE user_id = p_user_id AND for_date = v_today;

  -- Emit event on transition.
  IF v_new_level <> v_prev_level THEN
    INSERT INTO public.khalil_identity_event
      (user_id, from_level, to_level, score, window_30d, window_90d, window_180d, reason)
    VALUES
      (p_user_id, v_prev_level, v_new_level, v_score, v_w30, v_w90, v_w180,
       'auto_recompute');
  END IF;
END;
$$;

-- Helpers for level ordering ----------------------------------------------
CREATE OR REPLACE FUNCTION public.level_idx(p TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'seed' THEN 0
    WHEN 'stable' THEN 1
    WHEN 'rising' THEN 2
    WHEN 'disciplined' THEN 3
    WHEN 'sovereign' THEN 4
    ELSE 0 END
$$;

CREATE OR REPLACE FUNCTION public.level_name(i INTEGER)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE i
    WHEN 0 THEN 'seed'
    WHEN 1 THEN 'stable'
    WHEN 2 THEN 'rising'
    WHEN 3 THEN 'disciplined'
    WHEN 4 THEN 'sovereign'
    ELSE 'seed' END
$$;

-- 5) Adherence subscriber → recompute identity ----------------------------
CREATE OR REPLACE FUNCTION public.khalil_adherence_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.khalil_recompute_identity(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_adherence_identity_project ON public.khalil_adherence_daily;
CREATE TRIGGER khalil_adherence_identity_project
  AFTER INSERT OR UPDATE ON public.khalil_adherence_daily
  FOR EACH ROW EXECUTE FUNCTION public.khalil_adherence_after_change();

-- 6) Recovery subscriber → recompute identity -----------------------------
CREATE OR REPLACE FUNCTION public.khalil_recovery_state_after_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.khalil_recompute_identity(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS khalil_recovery_state_identity_project ON public.khalil_recovery_state;
CREATE TRIGGER khalil_recovery_state_identity_project
  AFTER INSERT OR UPDATE ON public.khalil_recovery_state
  FOR EACH ROW EXECUTE FUNCTION public.khalil_recovery_state_after_change();
