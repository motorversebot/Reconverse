-- Create storage bucket for unit photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('unit-photos', 'unit-photos', true);

-- Storage policies: dealer members can manage photos in their dealer folder
CREATE POLICY "Dealer members can upload unit photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'unit-photos'
  AND (SELECT is_dealer_member((storage.foldername(name))[1]::uuid))
);

CREATE POLICY "Dealer members can view unit photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'unit-photos'
  AND (SELECT is_dealer_member((storage.foldername(name))[1]::uuid))
);

CREATE POLICY "Dealer members can delete unit photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'unit-photos'
  AND (SELECT is_dealer_member((storage.foldername(name))[1]::uuid))
);

-- Public read for serving images
CREATE POLICY "Public can view unit photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'unit-photos');

-- Metadata table for unit photos
CREATE TABLE public.unit_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unit_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealer members: read unit photos"
ON public.unit_photos FOR SELECT
USING (is_dealer_member(dealer_id));

CREATE POLICY "Dealer members: insert unit photos"
ON public.unit_photos FOR INSERT
WITH CHECK (is_dealer_member(dealer_id));

CREATE POLICY "Dealer members: delete unit photos"
ON public.unit_photos FOR DELETE
USING (is_dealer_member(dealer_id));

CREATE POLICY "Platform admin: full access unit photos"
ON public.unit_photos FOR ALL
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

CREATE INDEX idx_unit_photos_unit ON public.unit_photos(unit_id);