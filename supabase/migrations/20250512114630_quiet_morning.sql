/*
  # Add end_time column to task_schedules table

  1. Changes
    - Add end_time column to task_schedules table
    - Update task generation function to consider end_time
    - Add validation to ensure end_time is after scheduled_time
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add end_time column to task_schedules
ALTER TABLE task_schedules
ADD COLUMN end_time TIMESTAMPTZ;

-- Add constraint to ensure end_time is after scheduled_time
ALTER TABLE task_schedules
ADD CONSTRAINT task_schedules_time_check
CHECK (end_time > scheduled_time);

-- Update task generation function to consider end_time
CREATE OR REPLACE FUNCTION generate_tasks_from_schedule()
RETURNS TRIGGER AS $$
DECLARE
  task_date DATE;
  end_date DATE;
BEGIN
  -- For new schedules, generate tasks
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.frequency_type != NEW.frequency_type) THEN
    task_date := CURRENT_DATE;
    end_date := LEAST(
      task_date + INTERVAL '7 days',
      (NEW.end_time AT TIME ZONE 'UTC')::date
    );
    
    -- Generate tasks based on frequency type
    WHILE task_date <= end_date LOOP
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
          (task_date)::date + NEW.scheduled_time::time,
          NEW.caregiver_id,
          NEW.patient_id
        );
      
      -- For weekly tasks
      ELSIF NEW.frequency_type = 'weekly' AND 
            NEW.frequency_days IS NOT NULL AND
            EXTRACT(DOW FROM task_date) = ANY(NEW.frequency_days) THEN
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
          (task_date)::date + NEW.scheduled_time::time,
          NEW.caregiver_id,
          NEW.patient_id
        );
      
      -- For one-time tasks
      ELSIF NEW.frequency_type = 'once' AND task_date = CURRENT_DATE THEN
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
      
      task_date := task_date + INTERVAL '1 day';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update task generation function that can be called manually
CREATE OR REPLACE FUNCTION generate_upcoming_tasks(days_ahead INTEGER DEFAULT 7)
RETURNS void AS $$
DECLARE
  schedule RECORD;
  task_date DATE;
  end_date DATE;
BEGIN
  task_date := CURRENT_DATE;
  
  FOR schedule IN 
    SELECT * FROM task_schedules 
    WHERE frequency_type IN ('daily', 'weekly')
  LOOP
    end_date := LEAST(
      task_date + days_ahead * INTERVAL '1 day',
      (schedule.end_time AT TIME ZONE 'UTC')::date
    );
    
    WHILE task_date <= end_date LOOP
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