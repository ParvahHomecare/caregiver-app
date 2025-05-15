-- Add new columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS frequency_type TEXT DEFAULT 'once',
ADD COLUMN IF NOT EXISTS frequency_days INTEGER[] DEFAULT NULL;

-- Add constraint to validate frequency_type
ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_frequency_type_check;

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

-- Add index for better performance
CREATE INDEX IF NOT EXISTS tasks_frequency_type_idx ON tasks (frequency_type);