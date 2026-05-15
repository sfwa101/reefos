CREATE POLICY "Drivers start their shifts"
ON public.salsabil_driver_shifts
FOR INSERT
TO authenticated
WITH CHECK (driver_id = current_driver_id());