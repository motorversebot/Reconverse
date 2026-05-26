
-- FIX 1: Prevent privilege escalation on profiles
-- Users should NOT be able to change is_platform_admin on their own profile
DROP POLICY IF EXISTS "Users: update own profile" ON public.profiles;

CREATE POLICY "Users: update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND is_platform_admin = (SELECT p.is_platform_admin FROM public.profiles p WHERE p.id = auth.uid())
);

-- FIX 2: Add verify_jwt = false config for edge functions
-- (handled in config.toml separately)

-- FIX 3: Add updated_at triggers if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_dealers_updated_at') THEN
    CREATE TRIGGER set_dealers_updated_at
    BEFORE UPDATE ON public.dealers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_profiles_updated_at') THEN
    CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_dealer_memberships_updated_at') THEN
    CREATE TRIGGER set_dealer_memberships_updated_at
    BEFORE UPDATE ON public.dealer_memberships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_units_updated_at') THEN
    CREATE TRIGGER set_units_updated_at
    BEFORE UPDATE ON public.units
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;
