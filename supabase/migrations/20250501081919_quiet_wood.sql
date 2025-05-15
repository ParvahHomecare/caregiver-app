/*
  # Add caregiver-patient assignments

  1. New Tables
    - `caregiver_patients` - Links caregivers to patients
      - `id` (uuid, primary key)
      - `caregiver_id` (uuid, references profiles.id)
      - `patient_id` (uuid, references patients.id)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for supervisors
*/

-- Create caregiver_patients table
CREATE TABLE IF NOT EXISTS caregiver_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(caregiver_id, patient_id)
);

-- Enable RLS
ALTER TABLE caregiver_patients ENABLE ROW LEVEL SECURITY;

-- Add policies for supervisors
CREATE POLICY "Supervisors can manage caregiver_patients"
ON caregiver_patients FOR ALL
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

-- Add policy for caregivers to view their assigned patients
CREATE POLICY "Caregivers can view their assigned patients"
ON caregiver_patients FOR SELECT
TO authenticated
USING (
  auth.uid() = caregiver_id
);