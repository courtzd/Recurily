/*
  # Add URL column to subscriptions table

  1. Changes
    - Add URL column to subscriptions table
    - Add URL format validation check

  2. Notes
    - URL is nullable since not all subscriptions will have a URL
    - URL format is validated using a CHECK constraint
*/

DO $$ 
BEGIN
  -- Add URL column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' 
    AND column_name = 'url'
  ) THEN
    ALTER TABLE subscriptions
      ADD COLUMN url text;

    -- Add URL format validation
    ALTER TABLE subscriptions
      ADD CONSTRAINT url_format_check 
      CHECK (
        url IS NULL OR 
        url ~* '^https?:\/\/([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$'
      );
  END IF;
END $$;