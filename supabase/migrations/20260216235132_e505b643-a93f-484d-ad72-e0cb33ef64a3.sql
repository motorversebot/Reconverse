
-- Add stage_entered_at to units table
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS stage_entered_at timestamp with time zone NOT NULL DEFAULT now();

-- Backfill existing units: set stage_entered_at to updated_at
UPDATE public.units SET stage_entered_at = updated_at WHERE stage_entered_at = created_at AND updated_at != created_at;

-- Create stage_history table
CREATE TABLE public.stage_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id),
  stage text NOT NULL,
  entered_at timestamp with time zone NOT NULL DEFAULT now(),
  exited_at timestamp with time zone,
  duration_hours numeric GENERATED ALWAYS AS (
    CASE WHEN exited_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (exited_at - entered_at)) / 3600.0
      ELSE NULL
    END
  ) STORED,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_stage_history_unit_id ON public.stage_history(unit_id);
CREATE INDEX idx_stage_history_dealer_stage ON public.stage_history(dealer_id, stage);

-- Enable RLS
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read stage_history"
  ON public.stage_history FOR SELECT
  USING (is_dealer_member(dealer_id));

CREATE POLICY "Platform admin: full access stage_history"
  ON public.stage_history FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- Internal insert policy for trigger (service role / security definer)
CREATE POLICY "Dealer members: insert stage_history"
  ON public.stage_history FOR INSERT
  WITH CHECK (is_dealer_member(dealer_id));

-- Trigger function: on stage change, close old history row + open new one + update stage_entered_at
CREATE OR REPLACE FUNCTION public.track_stage_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Close previous stage history row
    UPDATE public.stage_history
      SET exited_at = now()
      WHERE unit_id = NEW.id AND exited_at IS NULL;

    -- Open new stage history row
    INSERT INTO public.stage_history (unit_id, dealer_id, stage, entered_at)
    VALUES (NEW.id, NEW.dealer_id, NEW.status, now());

    -- Update stage_entered_at on the unit
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_track_stage_change
  BEFORE UPDATE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.track_stage_change();

-- Trigger for new units: seed initial stage_history row
CREATE OR REPLACE FUNCTION public.seed_stage_history()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.stage_history (unit_id, dealer_id, stage, entered_at)
  VALUES (NEW.id, NEW.dealer_id, NEW.status, now());
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_stage_history
  AFTER INSERT ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_stage_history();

-- Backfill stage_history for existing units
INSERT INTO public.stage_history (unit_id, dealer_id, stage, entered_at)
SELECT id, dealer_id, status, stage_entered_at
FROM public.units
WHERE is_deleted = false
ON CONFLICT DO NOTHING;
