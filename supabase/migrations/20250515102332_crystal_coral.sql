/*
  # Add proof verification columns to tasks table
  
  1. Changes
    - Add task_proof_enabled column to tasks table
    - Add task_proof_type column to tasks table
    
  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS task_proof_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS task_proof_type text DEFAULT 'photo'
CHECK (task_proof_type IN ('photo', 'audio'));

-- Update task_schedules to include proof settings
ALTER TABLE task_schedules
ADD COLUMN IF NOT EXISTS task_proof_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS task_proof_type text DEFAULT 'photo'
CHECK (task_proof_type IN ('photo', 'audio'));