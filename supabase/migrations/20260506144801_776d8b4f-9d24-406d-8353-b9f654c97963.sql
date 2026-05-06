
-- ============================================================
-- PHASE G — AUTONOMOUS PULSE & OMNI-HYDRATION
-- ============================================================

-- ---------- 1. SDUI MASS REGISTRATION ----------

CREATE OR REPLACE FUNCTION public._sdui_register_entity(
  p_key text, p_table text, p_label_ar text, p_label_en text,
  p_icon text, p_sort int
) RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.entity_definitions(key, table_name, label_i18n, icon, sort_order, is_system)
  VALUES (p_key, p_table, jsonb_build_object('ar', p_label_ar, 'en', p_label_en), p_icon, p_sort, false)
  ON CONFLICT (key) DO UPDATE SET
    table_name = EXCLUDED.table_name,
    label_i18n = EXCLUDED.label_i18n,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public._sdui_attr(
  p_entity uuid, p_key text, p_label_ar text, p_label_en text,
  p_data_type text, p_widget text, p_sort int,
  p_required bool DEFAULT false, p_searchable bool DEFAULT false,
  p_listable bool DEFAULT true
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO public.entity_attributes(
    entity_id, key, label_i18n, data_type, ui_widget,
    sort_order, is_required, is_searchable, is_listable
  ) VALUES (
    p_entity, p_key,
    jsonb_build_object('ar', p_label_ar, 'en', p_label_en),
    p_data_type, p_widget, p_sort, p_required, p_searchable, p_listable
  )
  ON CONFLICT (entity_id, key) DO UPDATE SET
    label_i18n = EXCLUDED.label_i18n,
    data_type = EXCLUDED.data_type,
    ui_widget = EXCLUDED.ui_widget,
    sort_order = EXCLUDED.sort_order,
    is_required = EXCLUDED.is_required,
    is_searchable = EXCLUDED.is_searchable,
    is_listable = EXCLUDED.is_listable;
$$;

DO $$
DECLARE eid uuid;
BEGIN
  -- drivers
  eid := public._sdui_register_entity('drivers','drivers','السائقون','Drivers','truck',100);
  PERFORM public._sdui_attr(eid,'full_name','الاسم','Full Name','text','input',10,true,true);
  PERFORM public._sdui_attr(eid,'phone','الهاتف','Phone','phone','input',20,false,true);
  PERFORM public._sdui_attr(eid,'national_id','الرقم القومي','National ID','text','input',30);
  PERFORM public._sdui_attr(eid,'driver_type','النوع','Type','text','input',40);
  PERFORM public._sdui_attr(eid,'vehicle_plate','اللوحة','Plate','text','input',50,false,true);
  PERFORM public._sdui_attr(eid,'base_salary','الراتب','Base Salary','decimal','currency',60);
  PERFORM public._sdui_attr(eid,'commission_pct','عمولة %','Commission %','decimal','currency',70);
  PERFORM public._sdui_attr(eid,'is_active','نشط','Active','boolean','switch',80);

  -- price_oracles
  eid := public._sdui_register_entity('price_oracles','price_oracles','مذبذب الأسعار','Price Oracles','activity',110);
  PERFORM public._sdui_attr(eid,'symbol','الرمز','Symbol','text','input',10,true,true);
  PERFORM public._sdui_attr(eid,'price_usd','السعر بالدولار','Price USD','decimal','currency',20,true);
  PERFORM public._sdui_attr(eid,'updated_at','آخر تحديث','Updated','datetime','input',30);

  -- securities
  eid := public._sdui_register_entity('securities','securities','الأوراق المالية','Securities','trending-up',120);
  PERFORM public._sdui_attr(eid,'symbol','الرمز','Symbol','text','input',10,true,true);
  PERFORM public._sdui_attr(eid,'company_name','الشركة','Company','text','input',20,false,true);
  PERFORM public._sdui_attr(eid,'total_supply','الإجمالي','Total Supply','decimal','currency',30);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',40);

  -- order_book
  eid := public._sdui_register_entity('order_book','order_book','دفتر الأوامر','Order Book','book-open',130);
  PERFORM public._sdui_attr(eid,'side','الاتجاه','Side','text','input',10);
  PERFORM public._sdui_attr(eid,'price','السعر','Price','decimal','currency',20);
  PERFORM public._sdui_attr(eid,'amount','الكمية','Amount','decimal','currency',30);
  PERFORM public._sdui_attr(eid,'filled_amount','المنفذ','Filled','decimal','currency',40);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',50);

  -- subscription_plans
  eid := public._sdui_register_entity('subscription_plans','subscription_plans','خطط الاشتراك','Subscription Plans','calendar',140);
  PERFORM public._sdui_attr(eid,'frequency','التكرار','Frequency','text','input',10,true);
  PERFORM public._sdui_attr(eid,'base_price','السعر','Base Price','decimal','currency',20,true);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',30);

  -- manufacturing_orders
  eid := public._sdui_register_entity('manufacturing_orders','manufacturing_orders','أوامر التصنيع','Manufacturing Orders','factory',150);
  PERFORM public._sdui_attr(eid,'product_id','المنتج','Product','text','input',10,true,true);
  PERFORM public._sdui_attr(eid,'target_quantity','الكمية','Target Qty','decimal','currency',20,true);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',30);
  PERFORM public._sdui_attr(eid,'scheduled_date','التاريخ','Scheduled','datetime','input',40);

  -- companies
  eid := public._sdui_register_entity('companies','companies','الشركات','Companies','building',160);
  PERFORM public._sdui_attr(eid,'name','الاسم','Name','text','input',10,true,true);
  PERFORM public._sdui_attr(eid,'tax_id','الرقم الضريبي','Tax ID','text','input',20,false,true);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',30);

  -- purchase_orders
  eid := public._sdui_register_entity('purchase_orders','purchase_orders','أوامر الشراء','Purchase Orders','file-text',170);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',10);
  PERFORM public._sdui_attr(eid,'total_amount','الإجمالي','Total','decimal','currency',20);

  -- conversations
  eid := public._sdui_register_entity('conversations','conversations','المحادثات','Conversations','message-square',180);
  PERFORM public._sdui_attr(eid,'type','النوع','Type','text','input',10);
  PERFORM public._sdui_attr(eid,'title','العنوان','Title','text','input',20,false,true);

  -- mini_apps
  eid := public._sdui_register_entity('mini_apps','mini_apps','التطبيقات المصغرة','Mini Apps','grid',190);
  PERFORM public._sdui_attr(eid,'app_key','المفتاح','App Key','text','input',10,true,true);
  PERFORM public._sdui_attr(eid,'manifest_url','الرابط','Manifest URL','text','input',20);
  PERFORM public._sdui_attr(eid,'status','الحالة','Status','text','input',30);
  PERFORM public._sdui_attr(eid,'version','الإصدار','Version','text','input',40);
END $$;

-- ---------- 2. SUBSCRIPTION CYCLER ----------

CREATE TABLE IF NOT EXISTS public.subscription_billing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  billed_at timestamptz NOT NULL DEFAULT now(),
  previous_due_at timestamptz,
  next_due_at timestamptz,
  status text NOT NULL DEFAULT 'GENERATED',
  notes text
);
CREATE INDEX IF NOT EXISTS idx_subscription_billing_runs_sub
  ON public.subscription_billing_runs(subscription_id, billed_at DESC);

ALTER TABLE public.subscription_billing_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage billing runs" ON public.subscription_billing_runs;
CREATE POLICY "Admins manage billing runs"
  ON public.subscription_billing_runs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.process_due_subscriptions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_freq text;
  v_interval interval;
  v_processed int := 0;
BEGIN
  FOR r IN
    SELECT s.id, s.next_billing_date, s.plan_id, p.frequency, p.base_price
    FROM public.subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.status = 'ACTIVE'
      AND s.next_billing_date IS NOT NULL
      AND s.next_billing_date <= now()
    LIMIT 500
  LOOP
    v_freq := lower(coalesce(r.frequency, 'monthly'));
    v_interval := CASE v_freq
      WHEN 'daily' THEN interval '1 day'
      WHEN 'weekly' THEN interval '7 days'
      WHEN 'biweekly' THEN interval '14 days'
      WHEN 'monthly' THEN interval '1 month'
      WHEN 'quarterly' THEN interval '3 months'
      WHEN 'yearly' THEN interval '1 year'
      ELSE interval '1 month'
    END;

    INSERT INTO public.subscription_billing_runs(
      subscription_id, amount, previous_due_at, next_due_at, status
    ) VALUES (
      r.id, coalesce(r.base_price, 0), r.next_billing_date,
      r.next_billing_date + v_interval, 'GENERATED'
    );

    UPDATE public.subscriptions
    SET next_billing_date = r.next_billing_date + v_interval,
        updated_at = now()
    WHERE id = r.id;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('processed', v_processed, 'ran_at', now());
END $$;

REVOKE ALL ON FUNCTION public.process_due_subscriptions() FROM public;
GRANT EXECUTE ON FUNCTION public.process_due_subscriptions() TO service_role;

-- ---------- 3. PG_CRON SCHEDULES ----------

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Hourly subscription cycler
DO $$
BEGIN
  PERFORM cron.unschedule('process-due-subscriptions-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-due-subscriptions-hourly',
  '0 * * * *',
  $$ SELECT public.process_due_subscriptions(); $$
);

-- Tayseer oracle worker — every 5 minutes hits the Edge Function
DO $$
BEGIN
  PERFORM cron.unschedule('tayseer-oracle-pulse-5m');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'tayseer-oracle-pulse-5m',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nymzeuaohwfisjvesumx.supabase.co/functions/v1/tayseer-oracle',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bXpldWFvaHdmaXNqdmVzdW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjE2MTcsImV4cCI6MjA5MzYzNzYxN30.CmEnyA58hL2wUoixwPuxnXOYWjk0zxqc6wVowZ1Svj0'
    ),
    body := jsonb_build_object('trigger', 'cron', 'at', now())
  ) AS request_id;
  $$
);
