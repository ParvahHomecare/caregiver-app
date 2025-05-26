/*
  # Create sample data for CaregiverApp

  1. Sample Data
    - Create a sample caregiver account
    - Create sample patients
    - Create sample tasks
    - Create sample documents

  2. Security
    - Ensure RLS policies are in place
    - Add necessary indexes for performance
*/

-- Insert sample caregiver
INSERT INTO auth.users (id, email)
VALUES
  ('d0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', 'demo@example.com')
ON CONFLICT (id) DO NOTHING;

-- Insert sample profile
INSERT INTO public.profiles (id, email, full_name, phone, role)
VALUES
  ('d0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', 'demo@example.com', 'Demo Caregiver', '+91 98765 43210', 'caregiver')
ON CONFLICT (id) DO NOTHING;

-- Insert sample patients
INSERT INTO public.patients (id, full_name, age, gender, address, medical_history, emergency_contact)
VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Raj Sharma', 72, 'male', '123 Gandhi Road, Mumbai', 'Diabetes, Hypertension', 'Priya Sharma (Daughter) - +91 98765 12345'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Anjali Patel', 65, 'female', '456 Nehru Street, Delhi', 'Arthritis', 'Amit Patel (Son) - +91 98765 67890')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks for today and upcoming days
INSERT INTO public.tasks (id, title, description, scheduled_time, status, caregiver_id, patient_id)
VALUES
  -- Today's tasks
  (gen_random_uuid(), 'Morning Medicine', 'Administer diabetes medication and check blood pressure', NOW()::date + '08:00:00'::time, 'pending', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'),
  (gen_random_uuid(), 'Physiotherapy Session', 'Assist with prescribed exercises', NOW()::date + '10:30:00'::time, 'pending', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'),
  (gen_random_uuid(), 'Lunch Time Care', 'Help with meal and medication', NOW()::date + '13:00:00'::time, 'pending', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', '550e8400-e29b-41d4-a716-446655440000'),
  
  -- Tomorrow's tasks
  (gen_random_uuid(), 'Morning Check-up', 'Check vitals and morning medication', NOW()::date + interval '1 day' + '09:00:00'::time, 'pending', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', '550e8400-e29b-41d4-a716-446655440000'),
  (gen_random_uuid(), 'Evening Walk', 'Accompany for a 30-minute walk', NOW()::date + interval '1 day' + '17:00:00'::time, 'pending', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', 'f47ac10b-58cc-4372-a567-0e02b2c3d479'),
  
  -- Day after tomorrow
  (gen_random_uuid(), 'Doctor Visit', 'Accompany to Dr. Kumar for regular checkup', NOW()::date + interval '2 days' + '11:00:00'::time, 'pending', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f', '550e8400-e29b-41d4-a716-446655440000');

-- Insert sample documents
INSERT INTO public.documents (id, name, type, url, profile_id)
VALUES
  (gen_random_uuid(), 'Nursing Certificate', 'certification', 'https://example.com/cert.pdf', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f'),
  (gen_random_uuid(), 'First Aid Certification', 'certification', 'https://example.com/firstaid.pdf', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f'),
  (gen_random_uuid(), 'Training Completion', 'document', 'https://example.com/training.pdf', 'd0d7d0e4-6bf9-4ade-a7c3-3e846847e62f');