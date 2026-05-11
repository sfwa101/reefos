-- Grant write access to runtime catalog tables to sandbox_exec for seeding (Wave 2.D).
-- Public read remains via RLS (already enabled). RLS policies still gate end-user access.
GRANT INSERT, UPDATE, DELETE ON public.usa_products       TO sandbox_exec;
GRANT INSERT, UPDATE, DELETE ON public.product_media      TO sandbox_exec;
GRANT INSERT, UPDATE, DELETE ON public.product_variants_v2 TO sandbox_exec;
GRANT INSERT, UPDATE, DELETE ON public.product_addons     TO sandbox_exec;
GRANT INSERT, UPDATE, DELETE ON public.product_nutrition  TO sandbox_exec;
GRANT INSERT, UPDATE, DELETE ON public.product_relations  TO sandbox_exec;