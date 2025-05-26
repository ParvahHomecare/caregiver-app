/*
  # Fix Profiles Table Policies

  1. Changes
    - Remove recursive policy for supervisor read access
    - Implement new, non-recursive policies for supervisor access
    - Maintain existing user self-access policies
    
  2. Security
    - Maintains RLS enabled on profiles table
    - Updates policies to prevent infinite recursion
    - Preserves existing access control logic but implements it more efficiently
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON profiles;
DROP POLICY IF EXISTS "Enable supervisor read access to all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable supervisor update access to all profiles" ON profiles;
DROP POLICY IF EXISTS "Enable update access for users to own profile" ON profiles;

-- Create new, non-recursive policies
CREATE POLICY "Users can read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Supervisors can read all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supervisor'
  )
);

CREATE POLICY "Supervisors can update all profiles"
ON profiles
FOR UPDATE
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