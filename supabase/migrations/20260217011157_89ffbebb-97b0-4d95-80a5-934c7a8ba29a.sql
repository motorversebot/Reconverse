-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'unit-photos';

-- Drop existing public read policy
DROP POLICY IF EXISTS "Public can view unit photos" ON storage.objects;

-- Add authenticated dealer-member-only read policy
CREATE POLICY "Dealer members: read unit photos storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'unit-photos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.unit_photos up
    WHERE up.file_path = name
    AND public.is_dealer_member(up.dealer_id)
  )
);