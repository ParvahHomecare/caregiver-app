/*
  # Add task proof configuration fields

  1. Changes
    - Add task_proof_enabled boolean field to task_schedules table
    - Add task_proof_type text field to task_schedules table with enum constraint
    - Add task_proof_enabled boolean field to tasks table
    - Add task_proof_type text field to tasks table with enum constraint

  2. Security
    - No changes to RLS policies required
*/

-- Add proof fields to task_schedules
ALTER TABLE task_schedules
ADD COLUMN task_proof_enabled boolean DEFAULT false,
ADD COLUMN task_proof_type text DEFAULT 'photo'::text,
ADD CONSTRAINT task_schedules_task_proof_type_check 
  CHECK (task_proof_type = ANY (ARRAY['photo'::text, 'audio'::text]));

-- Add proof fields to tasks
ALTER TABLE tasks
ADD COLUMN task_proof_enabled boolean DEFAULT false,
ADD COLUMN task_proof_type text DEFAULT 'photo'::text,
ADD CONSTRAINT tasks_task_proof_type_check 
  CHECK (task_proof_type = ANY (ARRAY['photo'::text, 'audio'::text]));