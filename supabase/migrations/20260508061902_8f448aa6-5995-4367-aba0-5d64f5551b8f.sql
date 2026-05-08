
-- Drop orphan trigger first (references sync_inventory_to_legacy)
DROP TRIGGER IF EXISTS trg_sync_inventory_to_legacy ON public.salsabil_inventory_matrix;

-- Zombie RPCs referencing dropped tables (orders, order_items, products)
DROP FUNCTION IF EXISTS public.accrue_partner_splits_on_delivered() CASCADE;
DROP FUNCTION IF EXISTS public.allocate_order_inventory(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.allocation_overview(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.apply_wac_on_purchase_item() CASCADE;
DROP FUNCTION IF EXISTS public.assign_nearest_driver(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.auto_route_order_to_branch(uuid, text, integer, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_bom_cost(text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_order_commission(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cfo_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.commit_sub_order_stock(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.complete_delivery(uuid, text, numeric, numeric, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.compute_charity_dues(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.compute_user_level(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.compute_zakat_assessment(numeric) CASCADE;
DROP FUNCTION IF EXISTS public.credit_vendors_on_order_complete() CASCADE;
DROP FUNCTION IF EXISTS public.distribute_affiliate_commission(uuid, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.driver_log_event(uuid, text, numeric, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.execute_trade_matching(text) CASCADE;
DROP FUNCTION IF EXISTS public.executive_dashboard_stats(integer) CASCADE;
DROP FUNCTION IF EXISTS public.financial_snapshot(integer) CASCADE;
DROP FUNCTION IF EXISTS public.frequently_bought_together(text[], integer) CASCADE;
DROP FUNCTION IF EXISTS public.hakim_deep_report(date, date) CASCADE;
DROP FUNCTION IF EXISTS public.is_product_available_in_zone(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.low_stock_products(integer) CASCADE;
DROP FUNCTION IF EXISTS public.mint_loyalty_points(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.order_has_vendor_store(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.personalized_flash_picks(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.place_order_atomic(uuid, numeric, text, uuid, text, text, text, jsonb, numeric, numeric, text, numeric, numeric, boolean, boolean, numeric, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.progress_to_next_level(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.refresh_user_preferences(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.release_order_reservation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.resolve_legacy_product_to_sku(text) CASCADE;
DROP FUNCTION IF EXISTS public.rotate_flash_sale() CASCADE;
DROP FUNCTION IF EXISTS public.rotate_flash_sale_v2() CASCADE;
DROP FUNCTION IF EXISTS public.submit_purchase_invoice(uuid, jsonb, numeric, text, date, numeric, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS public.sync_inventory_to_legacy() CASCADE;
DROP FUNCTION IF EXISTS public.update_universal_asset(uuid, text, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.user_total_spent(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_unit_pricing(text, text, numeric) CASCADE;
DROP FUNCTION IF EXISTS public.vendor_portal_stats() CASCADE;
