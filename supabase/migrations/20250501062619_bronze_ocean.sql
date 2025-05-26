/*
  # Fix recursive policies for profiles table

  1. Changes
    - Drop existing recursive policies
    - Create new non-recursive policies for profiles table
    
  2. Security
    - Maintain same access control but with optimized policies
    - Users can still view and update their own profiles
    - Supervisors maintain full access to all profiles
*/

-- First, drop the existing problematic policies
DROP POLICY IF EXISTS "Supervisors can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;

-- Create new optimized policies
CREATE POLICY "Enable read access for users to own profile"
ON profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = id
);

CREATE POLICY "Enable update access for users to own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable supervisor read access to all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles supervisor
    WHERE supervisor.id = auth.uid()
    AND supervisor.role = 'supervisor'
  )
);

CREATE POLICY "Enable supervisor update access to all profiles"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles supervisor
    WHERE supervisor.id = auth.uid()
    AND supervisor.role = 'supervisor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles supervisor
    WHERE supervisor.id = auth.uid()
    AND supervisor.role = 'supervisor'
  )
);