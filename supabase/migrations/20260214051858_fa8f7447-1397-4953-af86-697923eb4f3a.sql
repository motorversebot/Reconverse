-- Add a foreign key from dealer_memberships.user_id to profiles.id
-- The existing FK points to auth.users; we need one to public.profiles for PostgREST joins
ALTER TABLE public.dealer_memberships
  ADD CONSTRAINT dealer_memberships_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id)
  ON DELETE CASCADE;