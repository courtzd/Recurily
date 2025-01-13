/*
  # Add trial field to subscriptions table

  1. Changes
    - Add trial_start_date and trial_end_date columns to subscriptions table
    - Add trial_duration column to track trial period in days
    - Add is_trial column to easily identify trial subscriptions

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS trial_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end_date timestamptz,
  ADD COLUMN IF NOT EXISTS trial_duration integer,
  ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false;

-- Add constraint to ensure trial_end_date is after trial_start_date
ALTER TABLE subscriptions
  ADD CONSTRAINT trial_dates_check 
  CHECK (trial_end_date IS NULL OR trial_start_date IS NULL OR trial_end_date > trial_start_date);

-- Add constraint to ensure trial_duration is positive
ALTER TABLE subscriptions
  ADD CONSTRAINT trial_duration_check
  CHECK (trial_duration IS NULL OR trial_duration > 0);