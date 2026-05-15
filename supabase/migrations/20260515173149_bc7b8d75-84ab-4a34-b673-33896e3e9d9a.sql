-- ============================================================================
-- WAVE SOVEREIGN-SWORD · PHASE 1 — God Mode (is_sovereign + RLS unification)
-- ============================================================================

-- 1) Sovereign Override function — single source of truth.
CREATE OR REPLACE FUNCTION public.is_sovereign(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_uid, 'admin'::public.app_role)
$$;

REVOKE ALL ON FUNCTION public.is_sovereign(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_sovereign(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.is_sovereign(uuid) IS
  'Operation Sovereign Sword Phase 1 — returns true when the given user holds the admin role. Use inside RLS policies via OR public.is_sovereign(auth.uid()) to grant master-admin transparent access without spoofing identity.';

-- ============================================================================
-- 2) RLS unification — wrap restrictive driver-scoped SELECT/UPDATE policies
--    with an explicit OR is_sovereign() so admins see live operator data.
-- ============================================================================

-- ---- salsabil_driver_shifts ----
DROP POLICY IF EXISTS "Drivers read their shifts" ON public.salsabil_driver_shifts;
CREATE POLICY "Drivers read their shifts"
  ON public.salsabil_driver_shifts
  FOR SELECT
  USING (driver_id = public.current_driver_id() OR public.is_sovereign(auth.uid()));

DROP POLICY IF EXISTS "Drivers update their shifts" ON public.salsabil_driver_shifts;
CREATE POLICY "Drivers update their shifts"
  ON public.salsabil_driver_shifts
  FOR UPDATE
  USING (driver_id = public.current_driver_id() OR public.is_sovereign(auth.uid()));

-- ---- driver_positions ----
DROP POLICY IF EXISTS "drivers see own row" ON public.driver_positions;
CREATE POLICY "drivers see own row"
  ON public.driver_positions
  FOR SELECT
  USING (auth.uid() = driver_id OR public.is_sovereign(auth.uid()));

DROP POLICY IF EXISTS "drivers update own row" ON public.driver_positions;
CREATE POLICY "drivers update own row"
  ON public.driver_positions
  FOR UPDATE
  USING (auth.uid() = driver_id OR public.is_sovereign(auth.uid()));

-- ---- salsabil_fulfillment_nodes (driver/vendor scoped read+update) ----
DROP POLICY IF EXISTS "Drivers read their assigned nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Drivers read their assigned nodes"
  ON public.salsabil_fulfillment_nodes
  FOR SELECT
  USING (
    (driver_id IS NOT NULL AND driver_id = public.current_driver_id())
    OR public.is_sovereign(auth.uid())
  );

DROP POLICY IF EXISTS "Drivers update their assigned nodes" ON public.salsabil_fulfillment_nodes;
CREATE POLICY "Drivers update their assigned nodes"
  ON public.salsabil_fulfillment_nodes
  FOR UPDATE
  USING (
    (driver_id IS NOT NULL AND driver_id = public.current_driver_id())
    OR public.is_sovereign(auth.uid())
  );

-- ---- drivers (self view) ----
DROP POLICY IF EXISTS "drivers_self_view" ON public.drivers;
CREATE POLICY "drivers_self_view"
  ON public.drivers
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_sovereign(auth.uid()));

DROP POLICY IF EXISTS "drivers_self_update_location" ON public.drivers;
CREATE POLICY "drivers_self_update_location"
  ON public.drivers
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_sovereign(auth.uid()));

-- ---- delivery_tasks (broaden the driver UPDATE rule for admins) ----
DROP POLICY IF EXISTS "Driver updates own task" ON public.delivery_tasks;
CREATE POLICY "Driver updates own task"
  ON public.delivery_tasks
  FOR UPDATE
  USING (driver_id = auth.uid() OR public.is_sovereign(auth.uid()));
