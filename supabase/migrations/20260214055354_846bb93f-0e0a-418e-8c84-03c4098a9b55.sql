
-- Log estimate status changes (draft→submitted, submitted→approved, etc.)
CREATE OR REPLACE FUNCTION public.log_estimate_status_change()
RETURNS TRIGGER AS $$
DECLARE
  _unit_id UUID;
  _dealer_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT unit_id INTO _unit_id FROM public.estimates WHERE id = NEW.id;
    _dealer_id := NEW.dealer_id;

    INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
    VALUES (
      _unit_id, _dealer_id, auth.uid(),
      CASE
        WHEN NEW.status = 'submitted' THEN 'estimate'
        WHEN NEW.status IN ('approved','partial_approved','declined') THEN 'approval'
        ELSE 'estimate'
      END,
      'estimate_' || NEW.status,
      CASE
        WHEN NEW.status = 'submitted' THEN 'Estimate submitted for approval'
        WHEN NEW.status = 'approved' THEN 'Estimate fully approved'
        WHEN NEW.status = 'partial_approved' THEN 'Estimate partially approved'
        WHEN NEW.status = 'declined' THEN 'Estimate declined'
        WHEN NEW.status = 'void' THEN 'Estimate voided'
        ELSE 'Estimate status changed to ' || NEW.status
      END,
      jsonb_build_object('from_status', OLD.status, 'to_status', NEW.status, 'estimate_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_estimate_status
AFTER UPDATE ON public.estimates
FOR EACH ROW
EXECUTE FUNCTION public.log_estimate_status_change();

-- Log individual operation approval decisions
CREATE OR REPLACE FUNCTION public.log_operation_approval()
RETURNS TRIGGER AS $$
DECLARE
  _unit_id UUID;
  _dealer_id UUID;
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status AND NEW.approval_status IN ('approved','declined') THEN
    SELECT e.unit_id INTO _unit_id FROM public.estimates e WHERE e.id = NEW.estimate_id;
    _dealer_id := NEW.dealer_id;

    INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
    VALUES (
      _unit_id, _dealer_id, COALESCE(NEW.approved_by, auth.uid()),
      'approval',
      'operation_' || NEW.approval_status,
      CASE NEW.approval_status
        WHEN 'approved' THEN 'Approved operation: ' || NEW.name
        WHEN 'declined' THEN 'Declined operation: ' || NEW.name
      END,
      jsonb_build_object('operation_id', NEW.id, 'operation_name', NEW.name, 'decision', NEW.approval_status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_operation_approval
AFTER UPDATE ON public.estimate_operations
FOR EACH ROW
EXECUTE FUNCTION public.log_operation_approval();

-- Log work order item completions (repair stage)
CREATE OR REPLACE FUNCTION public.log_work_order_item_done()
RETURNS TRIGGER AS $$
DECLARE
  _unit_id UUID;
  _dealer_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'done' THEN
    SELECT wo.unit_id INTO _unit_id FROM public.work_orders wo WHERE wo.id = NEW.work_order_id;
    _dealer_id := NEW.dealer_id;

    INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
    VALUES (
      _unit_id, _dealer_id, auth.uid(),
      'repair',
      'repair_item_done',
      'Completed repair: ' || NEW.description,
      jsonb_build_object('work_order_item_id', NEW.id, 'type', NEW.type)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_work_order_item_done
AFTER UPDATE ON public.work_order_items
FOR EACH ROW
EXECUTE FUNCTION public.log_work_order_item_done();

-- Log work order status changes (open→in_progress→done)
CREATE OR REPLACE FUNCTION public.log_work_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
    VALUES (
      NEW.unit_id, NEW.dealer_id, auth.uid(),
      'repair',
      'work_order_' || NEW.status,
      CASE NEW.status
        WHEN 'in_progress' THEN 'Repair work started'
        WHEN 'done' THEN 'All repairs completed'
        ELSE 'Work order status: ' || NEW.status
      END,
      jsonb_build_object('work_order_id', NEW.id, 'from_status', OLD.status, 'to_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_work_order_status
AFTER UPDATE ON public.work_orders
FOR EACH ROW
EXECUTE FUNCTION public.log_work_order_status();

-- Log photo uploads
CREATE OR REPLACE FUNCTION public.log_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
  VALUES (
    NEW.unit_id, NEW.dealer_id, COALESCE(NEW.uploaded_by, auth.uid()),
    (SELECT status FROM public.units WHERE id = NEW.unit_id),
    'photo_uploaded',
    'Uploaded photo: ' || NEW.file_name,
    jsonb_build_object('photo_id', NEW.id, 'category', NEW.category, 'file_name', NEW.file_name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_photo_upload
AFTER INSERT ON public.unit_photos
FOR EACH ROW
EXECUTE FUNCTION public.log_photo_upload();
