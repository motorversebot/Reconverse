
-- Step 1: Add new enum values only (must be committed separately)
ALTER TYPE public.dealer_role ADD VALUE IF NOT EXISTS 'dealer_owner';
ALTER TYPE public.dealer_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.dealer_role ADD VALUE IF NOT EXISTS 'staff';
