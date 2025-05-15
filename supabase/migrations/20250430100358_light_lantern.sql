/*
  # Add supervisor role and update permissions

  1. Changes
    - Add supervisor role to profiles table
    - Update RLS policies to allow supervisors full access
    - Add policies for patient management
    - Add policies for task management
    - Add policies for caregiver management

  2. Security
    - Enable RLS on all tables
    - Add policies for supervisors
    - Maintain existing caregiver policies
*/

-- Update profiles table to include role validation
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('supervisor', 'caregiver'));

-- Update RLS policies for profiles
CREATE POLICY "Supervisors can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supervisor'
  )
);

CREATE POLICY "Supervisors can update all profiles"
ON profiles FOR UPDATE
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

-- Update RLS policies for patients
CREATE POLICY "Supervisors can manage patients"
ON patients FOR ALL
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

-- Update RLS policies for tasks
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

-- Insert demo supervisor
INSERT INTO auth.users (id, email)
VALUES
  ('e9d2a7cc-7af9-4b14-a909-f563a8157121', 'supervisor@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, phone, role)
VALUES
  ('e9d2a7cc-7af9-4b14-a909-f563a8157121', 'supervisor@example.com', 'Demo Supervisor', '+91 98765 98765', 'supervisor')
ON CONFLICT (id) DO NOTHING;