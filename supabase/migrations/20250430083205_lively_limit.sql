/*
  # Initial schema for CaregiverApp

  1. New Tables
    - `profiles` - User profile information
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `phone` (text)
      - `role` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `patients` - Patient information
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `age` (integer)
      - `gender` (text)
      - `address` (text)
      - `medical_history` (text)
      - `emergency_contact` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `tasks` - Caregiver tasks
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `scheduled_time` (timestamp)
      - `status` (text) - 'pending', 'completed', 'missed'
      - `caregiver_id` (uuid, references profiles.id)
      - `patient_id` (uuid, references patients.id)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      
    - `documents` - Caregiver documents
      - `id` (uuid, primary key)
      - `name` (text)
      - `type` (text)
      - `url` (text)
      - `profile_id` (uuid, references profiles.id)
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS on all tables
    - Add policies to allow authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'caregiver',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  address TEXT,
  medical_history TEXT,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending',
  caregiver_id UUID REFERENCES profiles(id),
  patient_id UUID REFERENCES patients(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Patients policies
CREATE POLICY "Users can view all patients"
  ON patients
  FOR SELECT
  TO authenticated
  USING (true);

-- Tasks policies
CREATE POLICY "Caregivers can view their assigned tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = caregiver_id);

CREATE POLICY "Caregivers can update their assigned tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = caregiver_id);

-- Documents policies
CREATE POLICY "Users can view their own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- Insert sample data

-- Insert sample patients
INSERT INTO patients (full_name, age, gender, address, medical_history, emergency_contact)
VALUES
  ('Rahul Sharma', 72, 'Male', '123 Gandhi Road, Mumbai', 'Hypertension, Diabetes Type 2', '+91 9876543210'),
  ('Priya Patel', 65, 'Female', '456 Nehru Street, Delhi', 'Arthritis, COPD', '+91 8765432109'),
  ('Amit Singh', 78, 'Male', '789 Tagore Lane, Kolkata', 'Heart Disease, Stroke History', '+91 7654321098');

-- Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- This function and trigger will be used by Supabase Auth to automatically create a profile entry when a new user signs up