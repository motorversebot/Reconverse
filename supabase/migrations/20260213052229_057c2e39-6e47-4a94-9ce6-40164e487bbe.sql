-- Change default status from 'Intake' to 'Inspection'
ALTER TABLE public.units ALTER COLUMN status SET DEFAULT 'Inspection';

-- Update any existing units with 'Intake' status to 'Inspection'
UPDATE public.units SET status = 'Inspection' WHERE status = 'Intake';

-- Update 'Parts Here' to 'In Service' and 'Repairing' to 'In Service'
UPDATE public.units SET status = 'In Service' WHERE status IN ('Parts Here', 'Repairing');