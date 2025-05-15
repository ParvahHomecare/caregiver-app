/*
  # Implement task scheduling system
  
  1. Changes
    - Rename existing tasks table to task_schedules
    - Create new tasks table for individual task instances
    - Update foreign key relationships
    - Add new columns for scheduling
    - Migrate existing data
    
  2. Security
    - Maintain existing RLS policies
    - Add new policies for task instances
*/

-- First, rename the existing tasks table to task_schedules
ALTER TABLE tasks RENAME TO task_schedules;

-- Create new tasks table for individual instances
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES task_schedules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  caregiver_id UUID REFERENCES profiles(id),
  patient_id UUID REFERENCES patients(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX tasks_schedule_id_idx ON tasks(schedule_id);
CREATE INDEX tasks_caregiver_id_idx ON tasks(caregiver_id);
CREATE INDEX tasks_patient_id_idx ON tasks(patient_id);
CREATE INDEX tasks_scheduled_time_idx ON tasks(scheduled_time);
CREATE INDEX tasks_status_idx ON tasks(status);

-- Enable RLS on new tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for tasks
CREATE POLICY "Caregivers can view their assigned tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = caregiver_id);

CREATE POLICY "Caregivers can update their assigned tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = caregiver_id);

CREATE POLICY "Supervisors can manage all tasks"
  ON tasks FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'supervisor'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'supervisor'
    )
  );

-- Create function to generate tasks from schedule
CREATE OR REPLACE FUNCTION generate_tasks_from_schedule()
RETURNS TRIGGER AS $$
DECLARE
  task_date DATE;
  days_to_generate INTEGER := 7; -- Generate tasks for the next 7 days
BEGIN
  -- For new schedules, generate tasks
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.frequency_type != NEW.frequency_type) THEN
    task_date := CURRENT_DATE;
    
    -- Generate tasks based on frequency type
    FOR i IN 0..days_to_generate-1 LOOP
      -- For daily tasks
      IF NEW.frequency_type = 'daily' THEN
        INSERT INTO tasks (
          schedule_id,
          title,
          description,
          scheduled_time,
          caregiver_id,
          patient_id
        )
        VALUES (
          NEW.id,
          NEW.title,
          NEW.description,
          (task_date + i * INTERVAL '1 day')::date + NEW.scheduled_time::time,
          NEW.caregiver_id,
          NEW.patient_id
        );
      
      -- For weekly tasks
      ELSIF NEW.frequency_type = 'weekly' AND 
            NEW.frequency_days IS NOT NULL AND
            EXTRACT(DOW FROM task_date + i * INTERVAL '1 day') = ANY(NEW.frequency_days) THEN
        INSERT INTO tasks (
          schedule_id,
          title,
          description,
          scheduled_time,
          caregiver_id,
          patient_id
        )
        VALUES (
          NEW.id,
          NEW.title,
          NEW.description,
          (task_date + i * INTERVAL '1 day')::date + NEW.scheduled_time::time,
          NEW.caregiver_id,
          NEW.patient_id
        );
      
      -- For one-time tasks
      ELSIF NEW.frequency_type = 'once' AND i = 0 THEN
        INSERT INTO tasks (
          schedule_id,
          title,
          description,
          scheduled_time,
          caregiver_id,
          patient_id
        )
        VALUES (
          NEW.id,
          NEW.title,
          NEW.description,
          NEW.scheduled_time,
          NEW.caregiver_id,
          NEW.patient_id
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for task generation
CREATE TRIGGER generate_tasks_trigger
  AFTER INSERT OR UPDATE ON task_schedules
  FOR EACH ROW
  EXECUTE FUNCTION generate_tasks_from_schedule();

-- Create function to update task status
CREATE OR REPLACE FUNCTION update_task_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update task status based on completion
  IF NEW.completed_at IS NOT NULL AND NEW.completed_at <= NEW.scheduled_time THEN
    NEW.status := 'completed';
  ELSIF NEW.completed_at IS NOT NULL AND NEW.completed_at > NEW.scheduled_time THEN
    NEW.status := 'completed_late';
  ELSIF NEW.scheduled_time < NOW() AND NEW.status = 'pending' THEN
    NEW.status := 'missed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status updates
CREATE TRIGGER update_task_status_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_status();

-- Migrate existing task data to generate initial tasks
INSERT INTO tasks (
  schedule_id,
  title,
  description,
  scheduled_time,
  status,
  caregiver_id,
  patient_id,
  completed_at,
  created_at,
  updated_at
)
SELECT
  id,
  title,
  description,
  scheduled_time,
  status,
  caregiver_id,
  patient_id,
  CASE 
    WHEN status = 'completed' THEN scheduled_time
    ELSE NULL
  END,
  created_at,
  updated_at
FROM task_schedules
WHERE frequency_type = 'once';

-- Add task generation function that can be called manually
CREATE OR REPLACE FUNCTION generate_upcoming_tasks(days_ahead INTEGER DEFAULT 7)
RETURNS void AS $$
DECLARE
  schedule RECORD;
  task_date DATE;
  end_date DATE;
BEGIN
  task_date := CURRENT_DATE;
  end_date := task_date + days_ahead * INTERVAL '1 day';
  
  FOR schedule IN 
    SELECT * FROM task_schedules 
    WHERE frequency_type IN ('daily', 'weekly')
  LOOP
    WHILE task_date < end_date LOOP
      -- For daily tasks
      IF schedule.frequency_type = 'daily' THEN
        INSERT INTO tasks (
          schedule_id,
          title,
          description,
          scheduled_time,
          caregiver_id,
          patient_id
        )
        VALUES (
          schedule.id,
          schedule.title,
          schedule.description,
          task_date::date + schedule.scheduled_time::time,
          schedule.caregiver_id,
          schedule.patient_id
        )
        ON CONFLICT DO NOTHING;
      
      -- For weekly tasks
      ELSIF schedule.frequency_type = 'weekly' AND 
            schedule.frequency_days IS NOT NULL AND
            EXTRACT(DOW FROM task_date) = ANY(schedule.frequency_days) THEN
        INSERT INTO tasks (
          schedule_id,
          title,
          description,
          scheduled_time,
          caregiver_id,
          patient_id
        )
        VALUES (
          schedule.id,
          schedule.title,
          schedule.description,
          task_date::date + schedule.scheduled_time::time,
          schedule.caregiver_id,
          schedule.patient_id
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      task_date := task_date + INTERVAL '1 day';
    END LOOP;
    
    task_date := CURRENT_DATE;
  END LOOP;
END;
$$ LANGUAGE plpgsql;