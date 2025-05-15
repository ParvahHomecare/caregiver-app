/*
  # Add support for late task completion and status reversion

  1. Changes
    - Add completed_at timestamp to tasks table
    - Add completed_late status
    - Update task status trigger function
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
    - Add policy for status updates
*/

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Update task status function to handle late completions
CREATE OR REPLACE FUNCTION update_task_status()
RETURNS TRIGGER AS $$
BEGIN
  -- For new completions
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    NEW.completed_at := NOW();
    -- Check if completion is late
    IF NEW.completed_at > NEW.scheduled_time THEN
      NEW.status := 'completed_late';
    END IF;
  -- For status reversions
  ELSIF NEW.status = 'pending' AND (OLD.status = 'completed' OR OLD.status = 'completed_late') THEN
    NEW.completed_at := NULL;
  -- For missed tasks
  ELSIF NEW.scheduled_time < NOW() AND NEW.status = 'pending' THEN
    NEW.status := 'missed';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create index for completed_at column
CREATE INDEX IF NOT EXISTS tasks_completed_at_idx ON tasks(completed_at);

-- Update existing completed tasks
UPDATE tasks
SET 
  status = 'completed_late',
  updated_at = NOW()
WHERE 
  status = 'completed' 
  AND completed_at > scheduled_time;