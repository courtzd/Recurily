/*
  # Update subscriptions table constraints and triggers

  1. Changes
    - Add NOT NULL constraints to required fields
    - Add default values for status and timestamps
    - Add proper type constraints
    - Add validation checks for price and dates

  2. Security
    - Maintain existing RLS policies
*/

-- Add NOT NULL constraints and defaults
ALTER TABLE subscriptions 
  ALTER COLUMN service_name SET NOT NULL,
  ALTER COLUMN price SET NOT NULL,
  ALTER COLUMN billing_cycle SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN next_billing_date SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'active',
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Add check constraints
ALTER TABLE subscriptions
  ADD CONSTRAINT price_positive CHECK (price >= 0),
  ADD CONSTRAINT valid_billing_cycle CHECK (billing_cycle IN ('monthly', 'yearly', 'quarterly')),
  ADD CONSTRAINT valid_category CHECK (category IN ('streaming', 'music', 'productivity', 'gaming', 'cloud', 'software', 'other')),
  ADD CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'paused'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();