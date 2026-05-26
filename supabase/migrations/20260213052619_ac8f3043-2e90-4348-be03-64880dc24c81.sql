-- Inspection checklist items per unit
CREATE TABLE public.unit_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id),
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  inspected_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(unit_id, category, item_name)
);

-- Enable RLS
ALTER TABLE public.unit_inspection_items ENABLE ROW LEVEL SECURITY;

-- Dealer members can read their own dealer's inspection items
CREATE POLICY "Dealer members: read inspection items"
ON public.unit_inspection_items FOR SELECT
USING (is_dealer_member(dealer_id));

-- Dealer members can insert inspection items
CREATE POLICY "Dealer members: insert inspection items"
ON public.unit_inspection_items FOR INSERT
WITH CHECK (is_dealer_member(dealer_id));

-- Dealer members can update inspection items
CREATE POLICY "Dealer members: update inspection items"
ON public.unit_inspection_items FOR UPDATE
USING (is_dealer_member(dealer_id))
WITH CHECK (is_dealer_member(dealer_id));

-- Dealer admins can delete inspection items
CREATE POLICY "Dealer admins: delete inspection items"
ON public.unit_inspection_items FOR DELETE
USING (is_dealer_admin(dealer_id));

-- Platform admin full access
CREATE POLICY "Platform admin: full access inspection items"
ON public.unit_inspection_items FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Update trigger
CREATE TRIGGER update_unit_inspection_items_updated_at
BEFORE UPDATE ON public.unit_inspection_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Index for fast lookups
CREATE INDEX idx_unit_inspection_items_unit ON public.unit_inspection_items(unit_id);