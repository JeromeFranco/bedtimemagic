-- Create public storage bucket for story audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-audio', 'story-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload story audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'story-audio');

-- Allow authenticated users to update existing story audio (for upserts)
CREATE POLICY "Authenticated users can update story audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'story-audio');

-- Allow public read access
CREATE POLICY "Public read access for story audio"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'story-audio');
