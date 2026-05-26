
-- Log MPI inspection item status changes (pass/fail/repair_needed)
CREATE OR REPLACE FUNCTION public.log_inspection_item_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status <> 'pending' THEN
    INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
    VALUES (
      NEW.unit_id, NEW.dealer_id, COALESCE(NEW.inspected_by, auth.uid()),
      'inspection',
      'mpi_' || NEW.status,
      CASE NEW.status
        WHEN 'pass' THEN 'Passed: ' || NEW.item_name
        WHEN 'fail' THEN 'Failed: ' || NEW.item_name
        WHEN 'repair_needed' THEN 'Needs repair: ' || NEW.item_name
        ELSE NEW.item_name || ' marked ' || NEW.status
      END,
      jsonb_build_object('item_id', NEW.id, 'item_name', NEW.item_name, 'category', NEW.category, 'from_status', OLD.status, 'to_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_inspection_item_change
AFTER UPDATE ON public.unit_inspection_items
FOR EACH ROW
EXECUTE FUNCTION public.log_inspection_item_change();
