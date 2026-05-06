
-- =====================================================================
-- PHASE O — SDUI ILLUMINATION
-- Register Phase M & N entities into the dynamic admin framework.
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- ACTION 1: ENTITY DEFINITIONS
-- ---------------------------------------------------------------------
INSERT INTO public.entity_definitions (key, label_i18n, table_name, primary_key_col, icon, description, sort_order, is_system)
VALUES
  ('global_catalog',
   '{"ar":"الكتالوج العالمي","en":"Global Catalog"}'::jsonb,
   'global_catalog', 'id', 'BookOpen',
   'Master catalog with fixed pricing across vendors', 110, true),
  ('commission_rules',
   '{"ar":"قواعد العمولات","en":"Commission Rules"}'::jsonb,
   'commission_rules', 'id', 'Percent',
   'Dynamic commission matrix per category and channel', 120, true),
  ('escrow_payouts',
   '{"ar":"الضمان والتجميد","en":"Escrow & Trust"}'::jsonb,
   'escrow_payouts', 'id', 'ShieldCheck',
   'Trust-based vendor payouts with freeze duration', 130, true),
  ('partner_tiers',
   '{"ar":"مستويات الشركاء","en":"Partner Tiers"}'::jsonb,
   'partner_tiers', 'id', 'Trophy',
   'Affiliate gamification tiers and commission percentages', 140, true),
  ('vendor_trust_settings',
   '{"ar":"إعدادات الثقة للموردين","en":"Vendor Trust Settings"}'::jsonb,
   'vendor_trust_settings', 'id', 'Settings2',
   'Per-vendor escrow freeze configuration', 150, true)
ON CONFLICT (key) DO UPDATE SET
  label_i18n = EXCLUDED.label_i18n,
  table_name = EXCLUDED.table_name,
  icon = EXCLUDED.icon,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

-- ---------------------------------------------------------------------
-- ACTION 2: ENTITY ATTRIBUTES
-- ---------------------------------------------------------------------

-- Helper: insert attribute (idempotent on (entity_id, key))
DO $$
DECLARE
  v_global_catalog       uuid;
  v_commission_rules     uuid;
  v_escrow_payouts       uuid;
  v_partner_tiers        uuid;
  v_vendor_trust         uuid;
BEGIN
  SELECT id INTO v_global_catalog   FROM public.entity_definitions WHERE key='global_catalog';
  SELECT id INTO v_commission_rules FROM public.entity_definitions WHERE key='commission_rules';
  SELECT id INTO v_escrow_payouts   FROM public.entity_definitions WHERE key='escrow_payouts';
  SELECT id INTO v_partner_tiers    FROM public.entity_definitions WHERE key='partner_tiers';
  SELECT id INTO v_vendor_trust     FROM public.entity_definitions WHERE key='vendor_trust_settings';

  -- ===== global_catalog =====
  INSERT INTO public.entity_attributes
    (entity_id, key, label_i18n, data_type, ui_widget, options_jsonb, sort_order, is_required, is_listable, is_searchable, is_filterable)
  VALUES
    (v_global_catalog,'name','{"ar":"الاسم","en":"Name"}','text','text','{}',10,true,true,true,false),
    (v_global_catalog,'category','{"ar":"الفئة","en":"Category"}','text','select',
       '{"choices":[{"value":"Pharmacy","label_i18n":{"ar":"صيدلية","en":"Pharmacy"}},{"value":"Retail","label_i18n":{"ar":"تجزئة","en":"Retail"}},{"value":"HomeFood","label_i18n":{"ar":"طعام منزلي","en":"HomeFood"}}]}',
       20,true,true,false,true),
    (v_global_catalog,'fixed_price','{"ar":"السعر الثابت","en":"Fixed Price"}','numeric','currency','{}',30,true,true,false,true),
    (v_global_catalog,'unit','{"ar":"الوحدة","en":"Unit"}','text','text','{}',40,false,true,false,false),
    (v_global_catalog,'metadata','{"ar":"بيانات إضافية","en":"Metadata"}','jsonb','json','{}',50,false,false,false,false)
  ON CONFLICT (entity_id, key) DO UPDATE SET
    label_i18n=EXCLUDED.label_i18n, data_type=EXCLUDED.data_type, ui_widget=EXCLUDED.ui_widget,
    options_jsonb=EXCLUDED.options_jsonb, sort_order=EXCLUDED.sort_order,
    is_required=EXCLUDED.is_required, is_listable=EXCLUDED.is_listable,
    is_searchable=EXCLUDED.is_searchable, is_filterable=EXCLUDED.is_filterable, updated_at=now();

  -- ===== commission_rules =====
  INSERT INTO public.entity_attributes
    (entity_id, key, label_i18n, data_type, ui_widget, options_jsonb, sort_order, is_required, is_listable, is_searchable, is_filterable)
  VALUES
    (v_commission_rules,'category','{"ar":"الفئة","en":"Category"}','text','select',
       '{"choices":[{"value":"Pharmacy","label_i18n":{"ar":"صيدلية","en":"Pharmacy"}},{"value":"Retail","label_i18n":{"ar":"تجزئة","en":"Retail"}},{"value":"HomeFood","label_i18n":{"ar":"طعام منزلي","en":"HomeFood"}}]}',
       10,true,true,false,true),
    (v_commission_rules,'channel','{"ar":"القناة","en":"Channel"}','text','select',
       '{"choices":[{"value":"POS","label_i18n":{"ar":"كاشير","en":"POS"}},{"value":"WEB","label_i18n":{"ar":"الويب","en":"Web"}}]}',
       20,true,true,false,true),
    (v_commission_rules,'rate_pct','{"ar":"النسبة %","en":"Rate %"}','numeric','number','{"min":0,"max":100,"step":0.01}',30,true,true,false,false),
    (v_commission_rules,'is_active','{"ar":"مفعّل","en":"Active"}','boolean','toggle','{}',40,false,true,false,true)
  ON CONFLICT (entity_id, key) DO UPDATE SET
    label_i18n=EXCLUDED.label_i18n, data_type=EXCLUDED.data_type, ui_widget=EXCLUDED.ui_widget,
    options_jsonb=EXCLUDED.options_jsonb, sort_order=EXCLUDED.sort_order,
    is_required=EXCLUDED.is_required, is_listable=EXCLUDED.is_listable,
    is_searchable=EXCLUDED.is_searchable, is_filterable=EXCLUDED.is_filterable, updated_at=now();

  -- ===== escrow_payouts =====
  INSERT INTO public.entity_attributes
    (entity_id, key, label_i18n, data_type, ui_widget, options_jsonb, sort_order, is_required, is_listable, is_searchable, is_filterable)
  VALUES
    (v_escrow_payouts,'vendor_id','{"ar":"المورد","en":"Vendor"}','uuid','relation_picker',
       '{"relation":{"table":"vendors","value":"id","label":"name"}}',10,true,true,true,true),
    (v_escrow_payouts,'order_id','{"ar":"الطلب","en":"Order"}','uuid','relation_picker',
       '{"relation":{"table":"orders","value":"id","label":"id"}}',20,false,true,true,false),
    (v_escrow_payouts,'amount','{"ar":"المبلغ","en":"Amount"}','numeric','currency','{}',30,true,true,false,false),
    (v_escrow_payouts,'status','{"ar":"الحالة","en":"Status"}','text','select',
       '{"choices":[{"value":"HELD","label_i18n":{"ar":"محجوز","en":"Held"}},{"value":"RELEASED","label_i18n":{"ar":"مُفرج","en":"Released"}},{"value":"DISPUTED","label_i18n":{"ar":"متنازع عليه","en":"Disputed"}}]}',
       40,true,true,false,true),
    (v_escrow_payouts,'release_date','{"ar":"تاريخ الإفراج","en":"Release Date"}','timestamptz','date_picker','{}',50,false,true,false,true),
    (v_escrow_payouts,'released_at','{"ar":"تم الإفراج في","en":"Released At"}','timestamptz','date_picker','{}',60,false,true,false,false)
  ON CONFLICT (entity_id, key) DO UPDATE SET
    label_i18n=EXCLUDED.label_i18n, data_type=EXCLUDED.data_type, ui_widget=EXCLUDED.ui_widget,
    options_jsonb=EXCLUDED.options_jsonb, sort_order=EXCLUDED.sort_order,
    is_required=EXCLUDED.is_required, is_listable=EXCLUDED.is_listable,
    is_searchable=EXCLUDED.is_searchable, is_filterable=EXCLUDED.is_filterable, updated_at=now();

  -- ===== partner_tiers =====
  INSERT INTO public.entity_attributes
    (entity_id, key, label_i18n, data_type, ui_widget, options_jsonb, sort_order, is_required, is_listable, is_searchable, is_filterable)
  VALUES
    (v_partner_tiers,'name','{"ar":"الاسم","en":"Name"}','text','text','{}',10,true,true,true,false),
    (v_partner_tiers,'b2c_first_order_pct','{"ar":"عمولة أول طلب %","en":"First Order %"}','numeric','number','{"min":0,"max":100,"step":0.01}',20,true,true,false,false),
    (v_partner_tiers,'b2c_recurring_pct','{"ar":"عمولة الطلبات المتكررة %","en":"Recurring %"}','numeric','number','{"min":0,"max":100,"step":0.01}',30,true,true,false,false),
    (v_partner_tiers,'duration_months','{"ar":"المدة (شهور)","en":"Duration (months)"}','integer','number','{"min":1}',40,false,true,false,false)
  ON CONFLICT (entity_id, key) DO UPDATE SET
    label_i18n=EXCLUDED.label_i18n, data_type=EXCLUDED.data_type, ui_widget=EXCLUDED.ui_widget,
    options_jsonb=EXCLUDED.options_jsonb, sort_order=EXCLUDED.sort_order,
    is_required=EXCLUDED.is_required, is_listable=EXCLUDED.is_listable,
    is_searchable=EXCLUDED.is_searchable, is_filterable=EXCLUDED.is_filterable, updated_at=now();

  -- ===== vendor_trust_settings =====
  INSERT INTO public.entity_attributes
    (entity_id, key, label_i18n, data_type, ui_widget, options_jsonb, sort_order, is_required, is_listable, is_searchable, is_filterable)
  VALUES
    (v_vendor_trust,'vendor_id','{"ar":"المورد","en":"Vendor"}','uuid','relation_picker',
       '{"relation":{"table":"vendors","value":"id","label":"name"}}',10,true,true,true,true),
    (v_vendor_trust,'freeze_duration_days','{"ar":"مدة التجميد (أيام)","en":"Freeze Duration (days)"}','integer','number','{"min":0,"max":90}',20,true,true,false,true)
  ON CONFLICT (entity_id, key) DO UPDATE SET
    label_i18n=EXCLUDED.label_i18n, data_type=EXCLUDED.data_type, ui_widget=EXCLUDED.ui_widget,
    options_jsonb=EXCLUDED.options_jsonb, sort_order=EXCLUDED.sort_order,
    is_required=EXCLUDED.is_required, is_listable=EXCLUDED.is_listable,
    is_searchable=EXCLUDED.is_searchable, is_filterable=EXCLUDED.is_filterable, updated_at=now();
END $$;

-- ---------------------------------------------------------------------
-- ACTION 3: ADMIN NAVIGATION
-- ---------------------------------------------------------------------
DO $$
DECLARE
  v_marketplace uuid;
  v_finance     uuid;
  v_growth      uuid;
  v_global_catalog_id   uuid;
  v_commission_id       uuid;
  v_escrow_id           uuid;
  v_tiers_id            uuid;
BEGIN
  SELECT id INTO v_marketplace FROM public.admin_navigation
    WHERE parent_id IS NULL AND label_i18n->>'en' = 'Marketplace' LIMIT 1;
  SELECT id INTO v_finance FROM public.admin_navigation
    WHERE parent_id IS NULL AND label_i18n->>'en' = 'Finance (Tayseer)' LIMIT 1;

  -- New top-level group: Affiliates & Growth
  SELECT id INTO v_growth FROM public.admin_navigation
    WHERE parent_id IS NULL AND label_i18n->>'en' = 'Affiliates & Growth' LIMIT 1;
  IF v_growth IS NULL THEN
    INSERT INTO public.admin_navigation (parent_id, label_i18n, icon, sort_order, is_visible)
    VALUES (NULL, '{"ar":"الشركاء والنمو","en":"Affiliates & Growth"}'::jsonb, 'TrendingUp', 55, true)
    RETURNING id INTO v_growth;
  END IF;

  SELECT id INTO v_global_catalog_id FROM public.entity_definitions WHERE key='global_catalog';
  SELECT id INTO v_commission_id     FROM public.entity_definitions WHERE key='commission_rules';
  SELECT id INTO v_escrow_id         FROM public.entity_definitions WHERE key='escrow_payouts';
  SELECT id INTO v_tiers_id          FROM public.entity_definitions WHERE key='partner_tiers';

  -- Marketplace > Global Catalog
  IF v_marketplace IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.admin_navigation WHERE parent_id=v_marketplace AND entity_id=v_global_catalog_id
  ) THEN
    INSERT INTO public.admin_navigation (parent_id, entity_id, label_i18n, icon, sort_order, is_visible)
    VALUES (v_marketplace, v_global_catalog_id, '{"ar":"الكتالوج العالمي","en":"Global Catalog"}'::jsonb, 'BookOpen', 80, true);
  END IF;

  -- Finance > Commission Rules
  IF v_finance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.admin_navigation WHERE parent_id=v_finance AND entity_id=v_commission_id
  ) THEN
    INSERT INTO public.admin_navigation (parent_id, entity_id, label_i18n, icon, sort_order, is_visible)
    VALUES (v_finance, v_commission_id, '{"ar":"قواعد العمولات","en":"Commission Rules"}'::jsonb, 'Percent', 60, true);
  END IF;

  -- Finance > Escrow & Trust
  IF v_finance IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.admin_navigation WHERE parent_id=v_finance AND entity_id=v_escrow_id
  ) THEN
    INSERT INTO public.admin_navigation (parent_id, entity_id, label_i18n, icon, sort_order, is_visible)
    VALUES (v_finance, v_escrow_id, '{"ar":"الضمان والتجميد","en":"Escrow & Trust"}'::jsonb, 'ShieldCheck', 70, true);
  END IF;

  -- Affiliates & Growth > Partner Tiers
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_navigation WHERE parent_id=v_growth AND entity_id=v_tiers_id
  ) THEN
    INSERT INTO public.admin_navigation (parent_id, entity_id, label_i18n, icon, sort_order, is_visible)
    VALUES (v_growth, v_tiers_id, '{"ar":"مستويات الشركاء","en":"Partner Tiers"}'::jsonb, 'Trophy', 10, true);
  END IF;
END $$;
