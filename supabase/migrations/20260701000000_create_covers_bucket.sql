-- Create public storage bucket for cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'covers');

-- Allow public read access
CREATE POLICY "Public read access for covers"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'covers');
