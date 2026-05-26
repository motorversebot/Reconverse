
-- Add intake_meta JSONB column to units for structured intake/options data
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS intake_meta jsonb DEFAULT '{}'::jsonb;
