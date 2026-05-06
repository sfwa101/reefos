-- Idempotency table for admin RPC calls
CREATE TABLE IF NOT EXISTS public.admin_idempotency_keys (
  key uuid PRIMARY KEY,
  entity_key text NOT NULL,
  record_id uuid,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read idempotency" ON public.admin_idempotency_keys
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-cleanup old idempotency keys (>24h)
CREATE INDEX IF NOT EXISTS idx_admin_idem_created ON public.admin_idempotency_keys(created_at);

-- ─── Unified Admin Upsert RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_entity_upsert(
  p_entity_key text,
  p_record_id uuid DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_def public.entity_definitions%ROWTYPE;
  v_table text;
  v_pk text;
  v_existing jsonb;
  v_result jsonb;
  v_cols text;
  v_vals text;
  v_set text;
  v_id uuid;
  v_sql text;
BEGIN
  -- AUTH GATE
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '28000';
  END IF;
  IF NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- IDEMPOTENCY SHORT-CIRCUIT
  IF p_idempotency_key IS NOT NULL THEN
    SELECT result INTO v_existing
    FROM public.admin_idempotency_keys
    WHERE key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  -- RESOLVE ENTITY DEFINITION
  SELECT * INTO v_def FROM public.entity_definitions WHERE key = p_entity_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_entity:%', p_entity_key USING ERRCODE = 'P0002';
  END IF;
  v_table := v_def.table_name;
  v_pk    := COALESCE(v_def.primary_key_col, 'id');

  -- WHITELIST: table must be in public schema and exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = v_table
  ) THEN
    RAISE EXCEPTION 'invalid_table:%', v_table USING ERRCODE = '42P01';
  END IF;

  -- BUILD column/value lists from payload keys that actually exist on target table
  SELECT
    string_agg(quote_ident(k), ','),
    string_agg(format('(%L::jsonb -> %L)', p_payload::text, k) ||
               '::text', ',')
  INTO v_cols, v_vals
  FROM jsonb_object_keys(p_payload) AS k
  WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name=v_table AND column_name=k
  );

  IF v_cols IS NULL THEN
    RAISE EXCEPTION 'empty_payload' USING ERRCODE = '22023';
  END IF;

  IF p_record_id IS NULL THEN
    -- INSERT via jsonb_populate_record style: use jsonb_to_record dynamic — simplest: use jsonb_set on insert
    v_sql := format(
      'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1) RETURNING to_jsonb(public.%I.*)',
      v_table, v_table, v_table
    );
    EXECUTE v_sql INTO v_result USING p_payload;
  ELSE
    v_sql := format(
      'UPDATE public.%I SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.%I, $1)) WHERE %I = $2 RETURNING to_jsonb(public.%I.*)',
      v_table,
      (SELECT string_agg(quote_ident(k), ',') FROM jsonb_object_keys(p_payload) k
        WHERE EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema='public' AND table_name=v_table AND column_name=k)
          AND k <> v_pk),
      (SELECT string_agg(quote_ident(k), ',') FROM jsonb_object_keys(p_payload) k
        WHERE EXISTS (SELECT 1 FROM information_schema.columns
                      WHERE table_schema='public' AND table_name=v_table AND column_name=k)
          AND k <> v_pk),
      v_table, v_pk, v_table
    );
    EXECUTE v_sql INTO v_result USING p_payload, p_record_id;
    IF v_result IS NULL THEN
      RAISE EXCEPTION 'record_not_found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- STORE IDEMPOTENCY RESULT
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO public.admin_idempotency_keys(key, entity_key, record_id, result)
    VALUES (p_idempotency_key, p_entity_key, p_record_id, v_result)
    ON CONFLICT (key) DO NOTHING;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_entity_upsert(text, uuid, jsonb, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_entity_upsert(text, uuid, jsonb, uuid) TO authenticated;