
-- Tire inspection data table
CREATE TABLE public.unit_tire_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id),
  tread_depth JSONB NOT NULL DEFAULT '{}',
  tire_pressure JSONB NOT NULL DEFAULT '{}',
  condition_flags JSONB NOT NULL DEFAULT '{}',
  wheel_checks JSONB NOT NULL DEFAULT '{}',
  recommendations TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id)
);

-- Enable RLS
ALTER TABLE public.unit_tire_inspections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Dealer members: read tire inspections"
  ON public.unit_tire_inspections FOR SELECT
  USING (is_dealer_member(dealer_id));

CREATE POLICY "Dealer members: insert tire inspections"
  ON public.unit_tire_inspections FOR INSERT
  WITH CHECK (is_dealer_member(dealer_id));

CREATE POLICY "Dealer members: update tire inspections"
  ON public.unit_tire_inspections FOR UPDATE
  USING (is_dealer_member(dealer_id))
  WITH CHECK (is_dealer_member(dealer_id));

CREATE POLICY "Dealer members: delete tire inspections"
  ON public.unit_tire_inspections FOR DELETE
  USING (is_dealer_member(dealer_id));

CREATE POLICY "Platform admin: full access tire inspections"
  ON public.unit_tire_inspections FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Timestamp trigger
CREATE TRIGGER update_unit_tire_inspections_updated_at
  BEFORE UPDATE ON public.unit_tire_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
