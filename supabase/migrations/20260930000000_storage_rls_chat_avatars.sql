-- Storage RLS for chat bucket (avatar uploads)
-- Allows users to upload/update avatars in chat/{user_id}/avatar/

-- Insert policy: allow users to upload to their own avatar folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = 'avatar'
);

-- Update policy: allow users to update their own avatars
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = 'avatar'
)
WITH CHECK (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = 'avatar'
);

-- Select policy: allow public read of avatars
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
TO public, authenticated
USING (
  bucket_id = 'chat'
  AND (storage.foldername(name))[2] = 'avatar'
);

-- Delete policy: allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND (storage.foldername(name))[2] = 'avatar'
);
