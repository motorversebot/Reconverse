
-- Add qc_approved flag to unit_photos for post-QC photo gating
ALTER TABLE public.unit_photos
ADD COLUMN qc_approved boolean NOT NULL DEFAULT false;

-- Staff-specific RLS: staff can only read photos that are qc_approved on units past QC
-- We need a function to check if user is staff-only (not manager/admin/owner)
CREATE OR REPLACE FUNCTION public.is_staff_only(_dealer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealer_memberships
    WHERE dealer_id = _dealer_id
      AND user_id = auth.uid()
      AND role = 'staff'
      AND is_active = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.dealer_memberships
    WHERE dealer_id = _dealer_id
      AND user_id = auth.uid()
      AND role IN ('dealer_owner', 'dealer_admin', 'manager')
      AND is_active = true
  );
$$;

-- Drop existing photo SELECT policy and replace with role-aware one
DROP POLICY IF EXISTS "Dealer members: read unit photos" ON public.unit_photos;

CREATE POLICY "Dealer members: read unit photos"
ON public.unit_photos
FOR SELECT
USING (
  CASE
    WHEN is_staff_only(dealer_id) THEN
      -- Staff can only see qc_approved photos on units that are past QC
      qc_approved = true
      AND EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = unit_photos.unit_id
          AND u.status IN ('ready', 'sold')
      )
    ELSE
      is_dealer_member(dealer_id)
  END
);

-- Staff should NOT be able to insert/update/delete photos - drop and recreate
DROP POLICY IF EXISTS "Dealer members: insert unit photos" ON public.unit_photos;
CREATE POLICY "Non-staff: insert unit photos"
ON public.unit_photos
FOR INSERT
WITH CHECK (
  is_dealer_member(dealer_id) AND NOT is_staff_only(dealer_id)
);

DROP POLICY IF EXISTS "Dealer members: delete unit photos" ON public.unit_photos;
CREATE POLICY "Non-staff: delete unit photos"
ON public.unit_photos
FOR DELETE
USING (
  is_dealer_member(dealer_id) AND NOT is_staff_only(dealer_id)
);

-- Staff should NOT be able to insert/update/delete on operational tables
-- Units: staff can read but not write
DROP POLICY IF EXISTS "Dealer members: insert units" ON public.units;
CREATE POLICY "Non-staff: insert units"
ON public.units
FOR INSERT
WITH CHECK (
  is_dealer_member(dealer_id) AND NOT is_staff_only(dealer_id)
);

DROP POLICY IF EXISTS "Dealer members: update own dealer units" ON public.units;
CREATE POLICY "Non-staff: update own dealer units"
ON public.units
FOR UPDATE
USING (is_dealer_member(dealer_id) AND NOT is_staff_only(dealer_id))
WITH CHECK (is_dealer_member(dealer_id) AND NOT is_staff_only(dealer_id));
