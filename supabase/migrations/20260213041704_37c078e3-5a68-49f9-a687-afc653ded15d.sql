-- Drop existing case-sensitive unique index and replace with case-insensitive
DROP INDEX IF EXISTS profiles_username_unique;
CREATE UNIQUE INDEX profiles_username_ci_unique ON public.profiles (lower(username)) WHERE username IS NOT NULL;