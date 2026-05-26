
-- ============================================
-- 1. ENUM for dealer membership roles
-- ============================================
CREATE TYPE public.dealer_role AS ENUM ('dealer_admin', 'dealer_staff');

-- ============================================
-- 2. BASE TABLES
-- ============================================

-- Dealers (tenants)
CREATE TABLE public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dealers_active ON public.dealers (is_active);

-- Profiles (1:1 with auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dealer memberships (tenant ↔ user link)
CREATE TABLE public.dealer_memberships (
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role dealer_role NOT NULL DEFAULT 'dealer_staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dealer_id, user_id)
);
CREATE INDEX idx_memberships_user ON public.dealer_memberships (user_id);
CREATE INDEX idx_memberships_dealer ON public.dealer_memberships (dealer_id);

-- Units (example tenant-scoped data)
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  stock_number TEXT,
  vin TEXT,
  year INTEGER,
  make TEXT,
  model TEXT,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'Inspection',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_units_dealer ON public.units (dealer_id);
CREATE INDEX idx_units_status ON public.units (status);

-- ============================================
-- 3. AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_dealers_updated_at BEFORE UPDATE ON public.dealers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_memberships_updated_at BEFORE UPDATE ON public.dealer_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_units_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 5. SECURITY DEFINER HELPER FUNCTIONS
-- ============================================

-- Check if current user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_platform_admin = true
  );
$$;

-- Check if current user is an active member of a specific dealer
CREATE OR REPLACE FUNCTION public.is_dealer_member(_dealer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealer_memberships
    WHERE dealer_id = _dealer_id
      AND user_id = auth.uid()
      AND is_active = true
  );
$$;

-- Check if current user is dealer_admin for a specific dealer
CREATE OR REPLACE FUNCTION public.is_dealer_admin(_dealer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealer_memberships
    WHERE dealer_id = _dealer_id
      AND user_id = auth.uid()
      AND role = 'dealer_admin'
      AND is_active = true
  );
$$;

-- Get all active dealer memberships for current user
CREATE OR REPLACE FUNCTION public.current_dealer_roles()
RETURNS SETOF public.dealer_memberships
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.dealer_memberships
  WHERE user_id = auth.uid()
    AND is_active = true;
$$;

-- ============================================
-- 6. ENABLE RLS
-- ============================================
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS POLICIES — DEALERS
-- ============================================

-- Platform admin: full access
CREATE POLICY "Platform admin: full access to dealers"
  ON public.dealers FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Dealer members: read own dealer only
CREATE POLICY "Dealer members: read own dealer"
  ON public.dealers FOR SELECT
  TO authenticated
  USING (public.is_dealer_member(id));

-- ============================================
-- 8. RLS POLICIES — PROFILES
-- ============================================

-- Users can read own profile
CREATE POLICY "Users: read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update own profile (non-admin fields)
CREATE POLICY "Users: update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Platform admin: full access
CREATE POLICY "Platform admin: full access to profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Dealer admins: read profiles of their dealer members
CREATE POLICY "Dealer admins: read dealer member profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_memberships dm
      WHERE dm.user_id = profiles.id
        AND public.is_dealer_admin(dm.dealer_id)
    )
  );

-- ============================================
-- 9. RLS POLICIES — DEALER_MEMBERSHIPS
-- ============================================

-- Platform admin: full access
CREATE POLICY "Platform admin: full access to memberships"
  ON public.dealer_memberships FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Members: read own membership
CREATE POLICY "Members: read own membership"
  ON public.dealer_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Dealer admins: read all memberships in their dealer
CREATE POLICY "Dealer admins: read dealer memberships"
  ON public.dealer_memberships FOR SELECT
  TO authenticated
  USING (public.is_dealer_admin(dealer_id));

-- Dealer admins: insert memberships in their dealer
CREATE POLICY "Dealer admins: insert memberships"
  ON public.dealer_memberships FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dealer_admin(dealer_id));

-- Dealer admins: update memberships in their dealer (cannot change own role)
CREATE POLICY "Dealer admins: update memberships"
  ON public.dealer_memberships FOR UPDATE
  TO authenticated
  USING (public.is_dealer_admin(dealer_id) AND user_id != auth.uid())
  WITH CHECK (public.is_dealer_admin(dealer_id) AND user_id != auth.uid());

-- Dealer admins: delete memberships in their dealer (cannot delete self)
CREATE POLICY "Dealer admins: delete memberships"
  ON public.dealer_memberships FOR DELETE
  TO authenticated
  USING (public.is_dealer_admin(dealer_id) AND user_id != auth.uid());

-- ============================================
-- 10. RLS POLICIES — UNITS
-- ============================================

-- Platform admin: full access
CREATE POLICY "Platform admin: full access to units"
  ON public.units FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- Dealer members: read units in their dealer
CREATE POLICY "Dealer members: read own dealer units"
  ON public.units FOR SELECT
  TO authenticated
  USING (public.is_dealer_member(dealer_id));

-- Dealer admins/staff: insert units in their dealer
CREATE POLICY "Dealer members: insert units"
  ON public.units FOR INSERT
  TO authenticated
  WITH CHECK (public.is_dealer_member(dealer_id));

-- Dealer members: update units in their dealer
CREATE POLICY "Dealer members: update own dealer units"
  ON public.units FOR UPDATE
  TO authenticated
  USING (public.is_dealer_member(dealer_id))
  WITH CHECK (public.is_dealer_member(dealer_id));

-- Dealer admins: delete units in their dealer
CREATE POLICY "Dealer admins: delete units"
  ON public.units FOR DELETE
  TO authenticated
  USING (public.is_dealer_admin(dealer_id));
