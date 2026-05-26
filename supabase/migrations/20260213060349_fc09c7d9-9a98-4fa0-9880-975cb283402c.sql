
-- Create the unit_status enum
CREATE TYPE public.unit_status AS ENUM (
  'inspection',
  'estimate',
  'approval',
  'repair',
  'qc',
  'ready',
  'sold'
);

-- Convert existing data to lowercase to match enum
UPDATE public.units SET status = lower(status);

-- Alter column to use enum
ALTER TABLE public.units 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.unit_status USING status::public.unit_status,
  ALTER COLUMN status SET DEFAULT 'inspection'::public.unit_status;
