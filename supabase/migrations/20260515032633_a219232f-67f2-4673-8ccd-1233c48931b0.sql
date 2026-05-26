
-- Notifications tables
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id uuid NOT NULL,
  user_id uuid NULL,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  unit_id uuid NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_dealer ON public.notifications(dealer_id, created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_dedup ON public.notifications(dealer_id, type, unit_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read notifications"
ON public.notifications FOR SELECT
USING (is_dealer_member(dealer_id) AND (user_id IS NULL OR user_id = auth.uid()));

CREATE POLICY "Dealer members: insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (is_dealer_member(dealer_id));

CREATE POLICY "Platform admin: full access notifications"
ON public.notifications FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Per-user read receipts (so broadcasts can be marked read independently)
CREATE TABLE public.notification_reads (
  notification_id uuid NOT NULL,
  user_id uuid NOT NULL,
  dealer_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX idx_notification_reads_user ON public.notification_reads(user_id, dealer_id);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users: read own read receipts"
ON public.notification_reads FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users: insert own read receipts"
ON public.notification_reads FOR INSERT
WITH CHECK (user_id = auth.uid() AND is_dealer_member(dealer_id));

CREATE POLICY "Users: delete own read receipts"
ON public.notification_reads FOR DELETE
USING (user_id = auth.uid());

CREATE POLICY "Platform admin: full access notification_reads"
ON public.notification_reads FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Trigger: estimate submitted -> approval_requested notification
CREATE OR REPLACE FUNCTION public.notify_estimate_submitted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stock text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'submitted' THEN
    SELECT stock_number INTO _stock FROM public.units WHERE id = NEW.unit_id;
    INSERT INTO public.notifications (dealer_id, user_id, type, severity, title, body, unit_id, metadata)
    VALUES (
      NEW.dealer_id, NULL, 'approval_requested', 'info',
      'Estimate submitted for approval',
      COALESCE('Stock #' || _stock, 'A unit') || ' is awaiting approval.',
      NEW.unit_id,
      jsonb_build_object('estimate_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_estimate_submitted
AFTER UPDATE ON public.estimates
FOR EACH ROW EXECUTE FUNCTION public.notify_estimate_submitted();

-- Trigger: unit moved to ready -> ready_for_sale notification
CREATE OR REPLACE FUNCTION public.notify_unit_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'ready' THEN
    INSERT INTO public.notifications (dealer_id, user_id, type, severity, title, body, unit_id, metadata)
    VALUES (
      NEW.dealer_id, NULL, 'ready_for_sale', 'info',
      'Unit ready for sale',
      COALESCE('Stock #' || NEW.stock_number, 'A unit') || ' is now Ready for Sale.',
      NEW.id,
      jsonb_build_object('stock_number', NEW.stock_number)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_unit_ready
AFTER UPDATE ON public.units
FOR EACH ROW EXECUTE FUNCTION public.notify_unit_ready();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_reads;
