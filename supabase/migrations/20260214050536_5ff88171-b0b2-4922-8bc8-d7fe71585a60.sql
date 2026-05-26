
-- Step 1: Migrate existing data
UPDATE public.dealer_memberships SET role = 'staff' WHERE role = 'dealer_staff';

-- Step 2: Update is_dealer_admin to check for owner/admin/manager roles
CREATE OR REPLACE FUNCTION public.is_dealer_admin(_dealer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealer_memberships
    WHERE dealer_id = _dealer_id
      AND user_id = auth.uid()
      AND role IN ('dealer_owner', 'dealer_admin', 'manager')
      AND is_active = true
  );
$$;

-- Step 3: Create helper for owner/admin (user management)
CREATE OR REPLACE FUNCTION public.is_dealer_owner_or_admin(_dealer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealer_memberships
    WHERE dealer_id = _dealer_id
      AND user_id = auth.uid()
      AND role IN ('dealer_owner', 'dealer_admin')
      AND is_active = true
  );
$$;

-- Step 4: Update RLS policies for dealer_memberships
DROP POLICY IF EXISTS "Dealer admins: insert memberships" ON public.dealer_memberships;
CREATE POLICY "Dealer admins: insert memberships"
ON public.dealer_memberships
FOR INSERT
WITH CHECK (is_dealer_owner_or_admin(dealer_id));

DROP POLICY IF EXISTS "Dealer admins: update memberships" ON public.dealer_memberships;
CREATE POLICY "Dealer admins: update memberships"
ON public.dealer_memberships
FOR UPDATE
USING (is_dealer_owner_or_admin(dealer_id) AND (user_id <> auth.uid()))
WITH CHECK (is_dealer_owner_or_admin(dealer_id) AND (user_id <> auth.uid()));

DROP POLICY IF EXISTS "Dealer admins: delete memberships" ON public.dealer_memberships;
CREATE POLICY "Dealer admins: delete memberships"
ON public.dealer_memberships
FOR DELETE
USING (is_dealer_owner_or_admin(dealer_id) AND (user_id <> auth.uid()));

-- Step 5: Update delete policies on other tables
DROP POLICY IF EXISTS "Dealer admins: delete units" ON public.units;
CREATE POLICY "Dealer admins: delete units"
ON public.units FOR DELETE
USING (is_dealer_owner_or_admin(dealer_id));

DROP POLICY IF EXISTS "Dealer admins: delete estimates" ON public.estimates;
CREATE POLICY "Dealer admins: delete estimates"
ON public.estimates FOR DELETE
USING (is_dealer_owner_or_admin(dealer_id));

DROP POLICY IF EXISTS "Dealer admins: delete inspection items" ON public.unit_inspection_items;
CREATE POLICY "Dealer admins: delete inspection items"
ON public.unit_inspection_items FOR DELETE
USING (is_dealer_owner_or_admin(dealer_id));
