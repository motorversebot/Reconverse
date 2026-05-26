
-- Add a unique index on lower(username) for case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));
