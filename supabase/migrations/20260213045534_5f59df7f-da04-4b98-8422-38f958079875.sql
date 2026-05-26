-- Change default status for new units from 'Inspection' to 'Intake'
ALTER TABLE public.units ALTER COLUMN status SET DEFAULT 'Intake';