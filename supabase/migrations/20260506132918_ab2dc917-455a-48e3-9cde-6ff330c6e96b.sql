-- ─── Rollback RPC ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_schema_rollback(
  p_entity_id uuid,
  p_mode text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_current_id uuid;
  v_previous_id uuid;
  v_previous_version int;
BEGIN
  IF v_caller IS NULL OR NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE='42501';
  END IF;

  SELECT id INTO v_current_id
  FROM public.admin_form_schemas
  WHERE entity_id = p_entity_id AND mode = p_mode AND active = true
  LIMIT 1;

  SELECT id, version INTO v_previous_id, v_previous_version
  FROM public.admin_form_schemas
  WHERE entity_id = p_entity_id AND mode = p_mode AND active = false
  ORDER BY version DESC
  LIMIT 1;

  IF v_previous_id IS NULL THEN
    RAISE EXCEPTION 'no_previous_version' USING ERRCODE='P0002';
  END IF;

  IF v_current_id IS NOT NULL THEN
    UPDATE public.admin_form_schemas SET active = false WHERE id = v_current_id;
  END IF;
  UPDATE public.admin_form_schemas SET active = true WHERE id = v_previous_id;

  RETURN jsonb_build_object(
    'rolled_back_to', v_previous_id,
    'version', v_previous_version
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_schema_rollback(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.admin_schema_rollback(uuid, text) TO authenticated;

-- ─── SEED: 5 Core System Entities ───────────────────────────────────
INSERT INTO public.entity_definitions (key, label_i18n, table_name, primary_key_col, is_system, sort_order, icon)
VALUES
  ('products',       '{"ar":"المنتجات","en":"Products"}'::jsonb,        'products',       'id', true, 10, 'Package'),
  ('categories',     '{"ar":"الفئات","en":"Categories"}'::jsonb,        'categories',     'id', true, 20, 'Grid3x3'),
  ('vendors',        '{"ar":"البائعون","en":"Vendors"}'::jsonb,         'vendors',        'id', true, 30, 'Store'),
  ('wallets',        '{"ar":"المحافظ","en":"Wallets"}'::jsonb,          'wallets',        'id', true, 40, 'Wallet'),
  ('ledger_entries', '{"ar":"قيود الدفتر","en":"Ledger Entries"}'::jsonb,'ledger_entries','id', true, 50, 'BookOpen')
ON CONFLICT (key) DO UPDATE SET
  label_i18n = EXCLUDED.label_i18n,
  is_system = true,
  sort_order = EXCLUDED.sort_order,
  icon = EXCLUDED.icon;

-- Helper: insert attributes if missing
DO $$
DECLARE
  v_eid uuid;
BEGIN
  -- products
  SELECT id INTO v_eid FROM public.entity_definitions WHERE key='products';
  INSERT INTO public.entity_attributes (entity_id, key, label_i18n, data_type, ui_widget, sort_order, is_listable, is_searchable)
  VALUES
    (v_eid, 'name',     '{"ar":"الاسم","en":"Name"}'::jsonb,        'text',    'input',   10, true, true),
    (v_eid, 'price',    '{"ar":"السعر","en":"Price"}'::jsonb,       'decimal', 'currency',20, true, false),
    (v_eid, 'category', '{"ar":"الفئة","en":"Category"}'::jsonb,    'text',    'input',   30, true, true),
    (v_eid, 'stock',    '{"ar":"المخزون","en":"Stock"}'::jsonb,     'number',  'input',   40, true, false),
    (v_eid, 'is_active','{"ar":"مفعّل","en":"Active"}'::jsonb,      'boolean', 'switch',  50, true, false)
  ON CONFLICT (entity_id, key) DO NOTHING;

  -- categories
  SELECT id INTO v_eid FROM public.entity_definitions WHERE key='categories';
  INSERT INTO public.entity_attributes (entity_id, key, label_i18n, data_type, ui_widget, sort_order, is_listable, is_searchable)
  VALUES
    (v_eid, 'name',      '{"ar":"الاسم","en":"Name"}'::jsonb,         'text',   'input',  10, true, true),
    (v_eid, 'slug',      '{"ar":"المعرّف","en":"Slug"}'::jsonb,       'text',   'input',  20, true, true),
    (v_eid, 'parent_id', '{"ar":"الأصل","en":"Parent"}'::jsonb,       'uuid',   'input',  30, true, false),
    (v_eid, 'sort_order','{"ar":"الترتيب","en":"Order"}'::jsonb,      'number', 'input',  40, true, false)
  ON CONFLICT (entity_id, key) DO NOTHING;

  -- vendors
  SELECT id INTO v_eid FROM public.entity_definitions WHERE key='vendors';
  INSERT INTO public.entity_attributes (entity_id, key, label_i18n, data_type, ui_widget, sort_order, is_listable, is_searchable)
  VALUES
    (v_eid, 'name',     '{"ar":"الاسم","en":"Name"}'::jsonb,         'text', 'input', 10, true, true),
    (v_eid, 'email',    '{"ar":"البريد","en":"Email"}'::jsonb,       'email','input', 20, true, true),
    (v_eid, 'phone',    '{"ar":"الجوال","en":"Phone"}'::jsonb,       'phone','input', 30, true, true),
    (v_eid, 'status',   '{"ar":"الحالة","en":"Status"}'::jsonb,      'text', 'input', 40, true, false)
  ON CONFLICT (entity_id, key) DO NOTHING;

  -- wallets
  SELECT id INTO v_eid FROM public.entity_definitions WHERE key='wallets';
  INSERT INTO public.entity_attributes (entity_id, key, label_i18n, data_type, ui_widget, sort_order, is_listable, is_searchable)
  VALUES
    (v_eid, 'user_id',  '{"ar":"المستخدم","en":"User"}'::jsonb,      'uuid',    'input',   10, true, true),
    (v_eid, 'balance',  '{"ar":"الرصيد","en":"Balance"}'::jsonb,     'decimal', 'currency',20, true, false),
    (v_eid, 'currency', '{"ar":"العملة","en":"Currency"}'::jsonb,    'text',    'input',   30, true, false),
    (v_eid, 'status',   '{"ar":"الحالة","en":"Status"}'::jsonb,      'text',    'input',   40, true, false)
  ON CONFLICT (entity_id, key) DO NOTHING;

  -- ledger_entries
  SELECT id INTO v_eid FROM public.entity_definitions WHERE key='ledger_entries';
  INSERT INTO public.entity_attributes (entity_id, key, label_i18n, data_type, ui_widget, sort_order, is_listable, is_searchable)
  VALUES
    (v_eid, 'wallet_id',          '{"ar":"المحفظة","en":"Wallet"}'::jsonb,      'uuid',    'input',   10, true, true),
    (v_eid, 'amount',             '{"ar":"المبلغ","en":"Amount"}'::jsonb,       'decimal', 'currency',20, true, false),
    (v_eid, 'direction',          '{"ar":"الاتجاه","en":"Direction"}'::jsonb,   'text',    'input',   30, true, false),
    (v_eid, 'transaction_group_id','{"ar":"المجموعة","en":"Group"}'::jsonb,     'uuid',    'input',   40, true, true),
    (v_eid, 'created_at',         '{"ar":"التاريخ","en":"Date"}'::jsonb,        'datetime','input',   50, true, false)
  ON CONFLICT (entity_id, key) DO NOTHING;
END $$;