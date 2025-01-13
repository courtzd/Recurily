/*
  # Update monitoring schema

  1. Changes
    - Add index for faster joins if not exists
    - Create notifications table if not exists
*/

-- Create index for faster joins if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'subscriptions_user_id_idx'
  ) THEN
    CREATE INDEX subscriptions_user_id_idx ON subscriptions(user_id);
  END IF;
END $$;

-- Update notifications schema if needed
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  ) THEN
    CREATE TABLE notifications (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) NOT NULL,
      type text NOT NULL CHECK (type IN ('renewal', 'price_change')),
      data jsonb NOT NULL,
      read boolean DEFAULT false,
      created_at timestamptz DEFAULT now()
    );

    ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own notifications"
      ON notifications FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);

    CREATE POLICY "Users can update own notifications"
      ON notifications FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;