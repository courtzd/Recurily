/*
  # Add storage bucket for subscription documents

  1. New Storage
    - Create subscription-documents bucket for storing uploaded files
  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their own documents
*/

-- Create storage bucket for subscription documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('subscription-documents', 'subscription-documents', true);

-- Create policy to allow authenticated users to upload files
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'subscription-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create policy to allow authenticated users to read their own documents
CREATE POLICY "Users can read their own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'subscription-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Create policy to allow authenticated users to delete their own documents
CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'subscription-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );