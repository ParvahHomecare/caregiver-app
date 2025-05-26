/*
  # Add start date column to task schedules

  1. Changes
    - Add start_date column to task_schedules table
    - Rename scheduled_time to start_time for clarity
    - Update constraints and triggers to use new column names
    - Update task generation functions
*/

-- Add start_date column and rename scheduled_time to start_time
ALTER TABLE task_schedules
RENAME COLUMN scheduled_time TO start_time;

-- Update time check constraint
ALTER TABLE task_schedules
DROP CONSTRAINT IF EXISTS task_schedules_time_check;

ALTER TABLE task_schedules
ADD CONSTRAINT task_schedules_time_check
CHECK (end_time > start_time);

-- Update task generation function
CREATE OR REPLACE FUNCTION generate_tasks_from_schedule()
RETURNS TRIGGER AS $$
DECLARE
  task_date DATE;
  end_date DATE;
BEGIN
  -- For new schedules, generate tasks
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.frequency_type != NEW.frequency_type) THEN
    task_date := (NEW.start_time AT TIME ZONE 'UTC')::date;
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
          (task_date)::date + NEW.start_time::time,
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
          (task_date)::date + NEW.start_time::time,
          NEW.caregiver_id,
          NEW.patient_id
        );
      
      -- For one-time tasks
      ELSIF NEW.frequency_type = 'once' AND task_date = (NEW.start_time AT TIME ZONE 'UTC')::date THEN
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
          NEW.start_time,
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

-- Update manual task generation function
CREATE OR REPLACE FUNCTION generate_upcoming_tasks(days_ahead INTEGER DEFAULT 7)
RETURNS void AS $$
DECLARE
  schedule RECORD;
  task_date DATE;
  end_date DATE;
BEGIN
  FOR schedule IN 
    SELECT * FROM task_schedules 
    WHERE frequency_type IN ('daily', 'weekly')
  LOOP
    task_date := GREATEST(
      CURRENT_DATE,
      (schedule.start_time AT TIME ZONE 'UTC')::date
    );
    
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
          task_date::date + schedule.start_time::time,
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
          task_date::date + schedule.start_time::time,
          schedule.caregiver_id,
          schedule.patient_id
        )
        ON CONFLICT DO NOTHING;
      END IF;
      
      task_date := task_date + INTERVAL '1 day';
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;