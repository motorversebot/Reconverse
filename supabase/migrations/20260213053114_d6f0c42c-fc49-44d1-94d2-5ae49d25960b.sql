-- Add soft delete columns
ALTER TABLE public.units
  ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN deleted_at TIMESTAMPTZ;

-- Index for fast filtering
CREATE INDEX idx_units_is_deleted ON public.units(dealer_id, is_deleted);