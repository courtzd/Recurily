/*
  # Add notifications insert policy

  1. Changes
    - Add INSERT policy for notifications table to allow users to create notifications
*/

-- Add INSERT policy for notifications
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' 
    AND policyname = 'Users can insert notifications'
  ) THEN
    CREATE POLICY "Users can insert notifications"
      ON notifications FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;