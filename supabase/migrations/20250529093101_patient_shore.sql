-- Add task proof settings to task generation trigger
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
          patient_id,
          task_proof_enabled,
          task_proof_type
        )
        VALUES (
          NEW.id,
          NEW.title,
          NEW.description,
          (task_date)::date + NEW.start_time::time,
          NEW.caregiver_id,
          NEW.patient_id,
          NEW.task_proof_enabled,
          NEW.task_proof_type
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
          patient_id,
          task_proof_enabled,
          task_proof_type
        )
        VALUES (
          NEW.id,
          NEW.title,
          NEW.description,
          (task_date)::date + NEW.start_time::time,
          NEW.caregiver_id,
          NEW.patient_id,
          NEW.task_proof_enabled,
          NEW.task_proof_type
        );
      
      -- For one-time tasks
      ELSIF NEW.frequency_type = 'once' AND task_date = (NEW.start_time AT TIME ZONE 'UTC')::date THEN
        INSERT INTO tasks (
          schedule_id,
          title,
          description,
          scheduled_time,
          caregiver_id,
          patient_id,
          task_proof_enabled,
          task_proof_type
        )
        VALUES (
          NEW.id,
          NEW.title,
          NEW.description,
          NEW.start_time,
          NEW.caregiver_id,
          NEW.patient_id,
          NEW.task_proof_enabled,
          NEW.task_proof_type
        );
      END IF;
      
      task_date := task_date + INTERVAL '1 day';
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;