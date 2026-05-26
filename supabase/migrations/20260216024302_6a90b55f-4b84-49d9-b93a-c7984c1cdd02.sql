
-- Create unit_comments table
CREATE TABLE public.unit_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.unit_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Dealer members: read unit comments"
ON public.unit_comments FOR SELECT
USING (is_dealer_member(dealer_id));

CREATE POLICY "Dealer members: insert unit comments"
ON public.unit_comments FOR INSERT
WITH CHECK (is_dealer_member(dealer_id) AND user_id = auth.uid());

CREATE POLICY "Dealer members: delete own comments"
ON public.unit_comments FOR DELETE
USING (is_dealer_member(dealer_id) AND user_id = auth.uid());

CREATE POLICY "Platform admin: full access unit comments"
ON public.unit_comments FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- Auto-log comments to activity feed
CREATE OR REPLACE FUNCTION public.log_unit_comment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.unit_activity_logs (unit_id, dealer_id, user_id, stage, action_type, description, metadata)
  VALUES (
    NEW.unit_id,
    NEW.dealer_id,
    NEW.user_id,
    (SELECT status FROM public.units WHERE id = NEW.unit_id),
    'comment_added',
    LEFT(NEW.comment, 120),
    jsonb_build_object('comment_id', NEW.id, 'full_comment', NEW.comment)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_unit_comment
AFTER INSERT ON public.unit_comments
FOR EACH ROW
EXECUTE FUNCTION public.log_unit_comment();
