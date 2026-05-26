
-- Activity audit log for each unit
CREATE TABLE public.unit_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stage TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_unit_activity_logs_unit ON public.unit_activity_logs(unit_id, created_at DESC);
CREATE INDEX idx_unit_activity_logs_dealer ON public.unit_activity_logs(dealer_id);

-- Enable RLS
ALTER TABLE public.unit_activity_logs ENABLE ROW LEVEL SECURITY;

-- Dealer members can read activity for their dealer
CREATE POLICY "Dealer members: read activity logs"
ON public.unit_activity_logs FOR SELECT
USING (is_dealer_member(dealer_id));

-- Dealer members can insert activity logs
CREATE POLICY "Dealer members: insert activity logs"
ON public.unit_activity_logs FOR INSERT
WITH CHECK (is_dealer_member(dealer_id));

-- Platform admin: full access
CREATE POLICY "Platform admin: full access activity logs"
ON public.unit_activity_logs FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Auto-log unit creation
CREATE OR REPLACE FUNCTION public.log_unit_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description)
  VALUES (NEW.id, NEW.dealer_id, auth.uid(), NEW.status, 'unit_created', 'Unit added to inventory');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_unit_created
AFTER INSERT ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.log_unit_created();

-- Auto-log stage changes
CREATE OR REPLACE FUNCTION public.log_unit_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
    VALUES (
      NEW.id, NEW.dealer_id, auth.uid(),
      NEW.status, 'stage_change',
      'Moved from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object('from_stage', OLD.status, 'to_stage', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_unit_stage_change
AFTER UPDATE ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.log_unit_stage_change();
