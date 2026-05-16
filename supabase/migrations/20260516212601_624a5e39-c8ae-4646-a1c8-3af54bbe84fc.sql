-- =============================================================
-- P2.7 — Workout + Weight + Analytics projections
-- =============================================================

-- ---------- WORKOUT --------------------------------------------------------
CREATE TABLE public.khalil_workout_session (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  focus TEXT,
  notes_key TEXT,
  client_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT khalil_workout_session_client_event_unique UNIQUE (user_id, client_event_id),
  CONSTRAINT khalil_workout_session_focus_chk CHECK (focus IS NULL OR length(focus) BETWEEN 1 AND 64),
  CONSTRAINT khalil_workout_session_close_after_start CHECK (closed_at IS NULL OR closed_at >= started_at)
);

-- only ONE open session per user
CREATE UNIQUE INDEX khalil_workout_session_one_open_per_user
  ON public.khalil_workout_session (user_id)
  WHERE closed_at IS NULL;

CREATE INDEX khalil_workout_session_user_started_idx
  ON public.khalil_workout_session (user_id, started_at DESC);

ALTER TABLE public.khalil_workout_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_workout_session_select_own"
  ON public.khalil_workout_session FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_workout_session_insert_own"
  ON public.khalil_workout_session FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE only to close (closed_at transitions NULL -> non-NULL); other fields immutable.
CREATE POLICY "khalil_workout_session_update_close_own"
  ON public.khalil_workout_session FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.khalil_workout_session_immutability_guard()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.user_id IS DISTINCT FROM NEW.user_id
     OR OLD.id IS DISTINCT FROM NEW.id
     OR OLD.started_at IS DISTINCT FROM NEW.started_at
     OR OLD.focus IS DISTINCT FROM NEW.focus
     OR OLD.client_event_id IS DISTINCT FROM NEW.client_event_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'khalil_workout_session_immutable_field' USING ERRCODE = '42501';
  END IF;
  IF OLD.closed_at IS NOT NULL AND OLD.closed_at IS DISTINCT FROM NEW.closed_at THEN
    RAISE EXCEPTION 'khalil_workout_session_already_closed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER khalil_workout_session_immutability
  BEFORE UPDATE ON public.khalil_workout_session
  FOR EACH ROW EXECUTE FUNCTION public.khalil_workout_session_immutability_guard();

-- No DELETE policy => deletes denied.

-- ---------- WORKOUT SETS ---------------------------------------------------
CREATE TABLE public.khalil_workout_set (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.khalil_workout_session(id) ON DELETE CASCADE,
  exercise_slug TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL,
  rpe NUMERIC(3,1),
  is_correction BOOLEAN NOT NULL DEFAULT false,
  corrects_set_id UUID REFERENCES public.khalil_workout_set(id),
  client_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT khalil_workout_set_client_event_unique UNIQUE (user_id, client_event_id),
  CONSTRAINT khalil_workout_set_exercise_slug_chk CHECK (exercise_slug ~ '^[a-z0-9][a-z0-9_-]{0,48}$'),
  CONSTRAINT khalil_workout_set_reps_chk CHECK (reps BETWEEN 1 AND 999),
  CONSTRAINT khalil_workout_set_weight_chk CHECK (weight_kg >= 0 AND weight_kg <= 1000),
  CONSTRAINT khalil_workout_set_index_chk CHECK (set_index BETWEEN 1 AND 999),
  CONSTRAINT khalil_workout_set_rpe_chk CHECK (rpe IS NULL OR (rpe >= 1 AND rpe <= 10)),
  CONSTRAINT khalil_workout_set_correction_chk CHECK (
    (is_correction = false AND corrects_set_id IS NULL)
    OR (is_correction = true AND corrects_set_id IS NOT NULL)
  )
);

CREATE INDEX khalil_workout_set_session_idx
  ON public.khalil_workout_set (session_id, set_index);

CREATE INDEX khalil_workout_set_user_created_idx
  ON public.khalil_workout_set (user_id, created_at DESC);

ALTER TABLE public.khalil_workout_set ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_workout_set_select_own"
  ON public.khalil_workout_set FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_workout_set_insert_own"
  ON public.khalil_workout_set FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE / DELETE policies — sets are immutable forever.

-- ---------- WORKOUT WEEKLY PROJECTION --------------------------------------
CREATE TABLE public.khalil_workout_projection_weekly (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  iso_year INTEGER NOT NULL,
  iso_week INTEGER NOT NULL,
  total_volume_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, iso_year, iso_week)
);

ALTER TABLE public.khalil_workout_projection_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_workout_weekly_select_own"
  ON public.khalil_workout_projection_weekly FOR SELECT
  USING (auth.uid() = user_id);

-- Projection maintainer
CREATE OR REPLACE FUNCTION public.khalil_workout_project_weekly()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_iso_year INTEGER;
  v_iso_week INTEGER;
  v_started TIMESTAMPTZ;
BEGIN
  SELECT started_at INTO v_started
    FROM public.khalil_workout_session
    WHERE id = NEW.session_id;
  IF v_started IS NULL THEN
    v_started := NEW.created_at;
  END IF;
  v_iso_year := EXTRACT(ISOYEAR FROM v_started)::int;
  v_iso_week := EXTRACT(WEEK FROM v_started)::int;

  INSERT INTO public.khalil_workout_projection_weekly AS p
    (user_id, iso_year, iso_week, total_volume_kg, total_sets, sessions_count, updated_at)
  VALUES
    (NEW.user_id, v_iso_year, v_iso_week, NEW.reps * NEW.weight_kg, 1, 0, now())
  ON CONFLICT (user_id, iso_year, iso_week) DO UPDATE
    SET total_volume_kg = p.total_volume_kg + EXCLUDED.total_volume_kg,
        total_sets = p.total_sets + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER khalil_workout_set_project_weekly
  AFTER INSERT ON public.khalil_workout_set
  FOR EACH ROW EXECUTE FUNCTION public.khalil_workout_project_weekly();

CREATE OR REPLACE FUNCTION public.khalil_workout_session_project_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_iso_year INTEGER;
  v_iso_week INTEGER;
BEGIN
  v_iso_year := EXTRACT(ISOYEAR FROM NEW.started_at)::int;
  v_iso_week := EXTRACT(WEEK FROM NEW.started_at)::int;
  INSERT INTO public.khalil_workout_projection_weekly AS p
    (user_id, iso_year, iso_week, total_volume_kg, total_sets, sessions_count, updated_at)
  VALUES (NEW.user_id, v_iso_year, v_iso_week, 0, 0, 1, now())
  ON CONFLICT (user_id, iso_year, iso_week) DO UPDATE
    SET sessions_count = p.sessions_count + 1,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER khalil_workout_session_project
  AFTER INSERT ON public.khalil_workout_session
  FOR EACH ROW EXECUTE FUNCTION public.khalil_workout_session_project_count();

-- ---------- WEIGHT ---------------------------------------------------------
CREATE TABLE public.khalil_weight_measurement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  for_date DATE NOT NULL,
  weight_kg NUMERIC(5,2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  client_event_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT khalil_weight_measurement_one_per_day UNIQUE (user_id, for_date),
  CONSTRAINT khalil_weight_measurement_client_event_unique UNIQUE (user_id, client_event_id),
  CONSTRAINT khalil_weight_measurement_kg_chk CHECK (weight_kg >= 20 AND weight_kg <= 500),
  CONSTRAINT khalil_weight_measurement_source_chk CHECK (source IN ('manual','imported'))
);

CREATE INDEX khalil_weight_measurement_user_date_idx
  ON public.khalil_weight_measurement (user_id, for_date DESC);

ALTER TABLE public.khalil_weight_measurement ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_weight_measurement_select_own"
  ON public.khalil_weight_measurement FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "khalil_weight_measurement_insert_own"
  ON public.khalil_weight_measurement FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE/DELETE policies.

-- ---------- WEIGHT TREND PROJECTION ----------------------------------------
CREATE TABLE public.khalil_weight_projection (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latest_kg NUMERIC(5,2),
  latest_for_date DATE,
  avg_7d NUMERIC(6,2),
  avg_30d NUMERIC(6,2),
  avg_90d NUMERIC(6,2),
  delta_7d NUMERIC(6,2),
  delta_30d NUMERIC(6,2),
  delta_90d NUMERIC(6,2),
  trend_direction TEXT NOT NULL DEFAULT 'flat',
  measurements_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT khalil_weight_projection_trend_chk
    CHECK (trend_direction IN ('down','flat','up'))
);

ALTER TABLE public.khalil_weight_projection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_weight_projection_select_own"
  ON public.khalil_weight_projection FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.khalil_weight_project_trend()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_latest NUMERIC(5,2);
  v_latest_date DATE;
  v_avg7 NUMERIC(6,2);
  v_avg30 NUMERIC(6,2);
  v_avg90 NUMERIC(6,2);
  v_prev7 NUMERIC(6,2);
  v_prev30 NUMERIC(6,2);
  v_prev90 NUMERIC(6,2);
  v_count INTEGER;
  v_trend TEXT;
  v_delta7 NUMERIC(6,2);
BEGIN
  SELECT weight_kg, for_date INTO v_latest, v_latest_date
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id
    ORDER BY for_date DESC LIMIT 1;

  SELECT COUNT(*) INTO v_count
    FROM public.khalil_weight_measurement WHERE user_id = NEW.user_id;

  SELECT AVG(weight_kg)::numeric(6,2) INTO v_avg7
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id AND for_date >= NEW.for_date - INTERVAL '7 days';
  SELECT AVG(weight_kg)::numeric(6,2) INTO v_avg30
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id AND for_date >= NEW.for_date - INTERVAL '30 days';
  SELECT AVG(weight_kg)::numeric(6,2) INTO v_avg90
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id AND for_date >= NEW.for_date - INTERVAL '90 days';

  SELECT weight_kg INTO v_prev7
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id AND for_date <= NEW.for_date - INTERVAL '7 days'
    ORDER BY for_date DESC LIMIT 1;
  SELECT weight_kg INTO v_prev30
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id AND for_date <= NEW.for_date - INTERVAL '30 days'
    ORDER BY for_date DESC LIMIT 1;
  SELECT weight_kg INTO v_prev90
    FROM public.khalil_weight_measurement
    WHERE user_id = NEW.user_id AND for_date <= NEW.for_date - INTERVAL '90 days'
    ORDER BY for_date DESC LIMIT 1;

  v_delta7 := COALESCE(v_latest - v_prev7, 0);
  v_trend := CASE
    WHEN v_delta7 < -0.2 THEN 'down'
    WHEN v_delta7 > 0.2 THEN 'up'
    ELSE 'flat'
  END;

  INSERT INTO public.khalil_weight_projection AS p
    (user_id, latest_kg, latest_for_date, avg_7d, avg_30d, avg_90d,
     delta_7d, delta_30d, delta_90d, trend_direction, measurements_count, updated_at)
  VALUES (NEW.user_id, v_latest, v_latest_date, v_avg7, v_avg30, v_avg90,
          v_delta7,
          COALESCE(v_latest - v_prev30, 0),
          COALESCE(v_latest - v_prev90, 0),
          v_trend, v_count, now())
  ON CONFLICT (user_id) DO UPDATE
    SET latest_kg = EXCLUDED.latest_kg,
        latest_for_date = EXCLUDED.latest_for_date,
        avg_7d = EXCLUDED.avg_7d,
        avg_30d = EXCLUDED.avg_30d,
        avg_90d = EXCLUDED.avg_90d,
        delta_7d = EXCLUDED.delta_7d,
        delta_30d = EXCLUDED.delta_30d,
        delta_90d = EXCLUDED.delta_90d,
        trend_direction = EXCLUDED.trend_direction,
        measurements_count = EXCLUDED.measurements_count,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER khalil_weight_project
  AFTER INSERT ON public.khalil_weight_measurement
  FOR EACH ROW EXECUTE FUNCTION public.khalil_weight_project_trend();

-- ---------- STREAK STATE PROJECTION ----------------------------------------
CREATE TABLE public.khalil_streak_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prayer_current INTEGER NOT NULL DEFAULT 0,
  prayer_longest INTEGER NOT NULL DEFAULT 0,
  habit_current INTEGER NOT NULL DEFAULT 0,
  habit_longest INTEGER NOT NULL DEFAULT 0,
  combined_current INTEGER NOT NULL DEFAULT 0,
  combined_longest INTEGER NOT NULL DEFAULT 0,
  last_for_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.khalil_streak_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_streak_state_select_own"
  ON public.khalil_streak_state FOR SELECT
  USING (auth.uid() = user_id);

-- Recompute streaks when adherence row materializes/updates.
CREATE OR REPLACE FUNCTION public.khalil_streak_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_p_current INTEGER := 0;
  v_h_current INTEGER := 0;
  v_c_current INTEGER := 0;
  v_p_longest INTEGER := 0;
  v_h_longest INTEGER := 0;
  v_c_longest INTEGER := 0;
  r RECORD;
  v_p_run INTEGER := 0;
  v_h_run INTEGER := 0;
  v_c_run INTEGER := 0;
BEGIN
  FOR r IN
    SELECT for_date, prayer_score, habit_score, combined_score
    FROM public.khalil_adherence_daily
    WHERE user_id = NEW.user_id
    ORDER BY for_date ASC
  LOOP
    IF r.prayer_score >= 0.6 THEN v_p_run := v_p_run + 1; ELSE v_p_run := 0; END IF;
    IF r.habit_score  >= 0.6 THEN v_h_run := v_h_run + 1; ELSE v_h_run := 0; END IF;
    IF r.combined_score >= 0.6 THEN v_c_run := v_c_run + 1; ELSE v_c_run := 0; END IF;
    IF v_p_run > v_p_longest THEN v_p_longest := v_p_run; END IF;
    IF v_h_run > v_h_longest THEN v_h_longest := v_h_run; END IF;
    IF v_c_run > v_c_longest THEN v_c_longest := v_c_run; END IF;
  END LOOP;
  v_p_current := v_p_run;
  v_h_current := v_h_run;
  v_c_current := v_c_run;

  INSERT INTO public.khalil_streak_state AS s
    (user_id, prayer_current, prayer_longest, habit_current, habit_longest,
     combined_current, combined_longest, last_for_date, updated_at)
  VALUES (NEW.user_id, v_p_current, v_p_longest, v_h_current, v_h_longest,
          v_c_current, v_c_longest, NEW.for_date, now())
  ON CONFLICT (user_id) DO UPDATE
    SET prayer_current = EXCLUDED.prayer_current,
        prayer_longest = GREATEST(s.prayer_longest, EXCLUDED.prayer_longest),
        habit_current = EXCLUDED.habit_current,
        habit_longest = GREATEST(s.habit_longest, EXCLUDED.habit_longest),
        combined_current = EXCLUDED.combined_current,
        combined_longest = GREATEST(s.combined_longest, EXCLUDED.combined_longest),
        last_for_date = EXCLUDED.last_for_date,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER khalil_adherence_streak_project
  AFTER INSERT OR UPDATE ON public.khalil_adherence_daily
  FOR EACH ROW EXECUTE FUNCTION public.khalil_streak_project();

-- ---------- ANALYTICS EVENT LOG (audit) ------------------------------------
CREATE TABLE public.khalil_analytics_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX khalil_analytics_event_user_idx
  ON public.khalil_analytics_event (user_id, occurred_at DESC);

ALTER TABLE public.khalil_analytics_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "khalil_analytics_event_select_own"
  ON public.khalil_analytics_event FOR SELECT
  USING (auth.uid() = user_id);

-- No client INSERT/UPDATE/DELETE — server-fn only via security definer or service role.
