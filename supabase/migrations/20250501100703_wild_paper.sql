/*
  # Add task frequency fields

  1. Changes
    - Add frequency_type column to tasks table
    - Add frequency_days column to tasks table for weekly tasks
    - Update existing tasks to have 'once' frequency type
*/

-- Add new columns to tasks table
ALTER TABLE tasks
ADD COLUMN frequency_type TEXT DEFAULT 'once',
ADD COLUMN frequency_days INTEGER[] DEFAULT NULL;

-- Add constraint to validate frequency_type
ALTER TABLE tasks
ADD CONSTRAINT tasks_frequency_type_check
CHECK (frequency_type IN ('once', 'daily', 'weekly'));

-- Update existing tasks to have 'once' frequency type
UPDATE tasks
SET frequency_type = 'once'
WHERE frequency_type IS NULL;

-- Make frequency_type NOT NULL
ALTER TABLE tasks
ALTER COLUMN frequency_type SET NOT NULL;