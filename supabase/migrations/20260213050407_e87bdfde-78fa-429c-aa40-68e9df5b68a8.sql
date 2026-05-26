
-- Add columns for decoded VIN data
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS trim text,
  ADD COLUMN IF NOT EXISTS engine text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS drive_type text,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS vin_decode_raw jsonb;
