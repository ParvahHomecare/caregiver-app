/*
  # Add task proofs functionality
  
  1. New Storage Bucket
    - Create bucket for storing task completion proofs
  
  2. New Tables
    - `task_proofs`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key)
      - `caregiver_id` (uuid, foreign key)
      - `type` (text - photo|audio)
      - `file_path` (text)
      - `created_at` (timestamp)
  
  3. Security
    - Enable RLS on task_proofs table
    - Add policies for authenticated users to manage their own proofs
    - Add policy for supervisors to view all proofs
*/

-- Create storage bucket for task proofs
insert into storage.buckets (id, name)
values ('task-proofs', 'task-proofs');

-- Create storage policy for authenticated users
create policy "Users can upload their own proofs"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'task-proofs' AND
  auth.uid()::text = (split_part(name, '/', 1))
);

create policy "Users can read their own proofs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'task-proofs' AND
  (
    auth.uid()::text = (split_part(name, '/', 1)) OR
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'supervisor'
    )
  )
);

-- Create task_proofs table
create table if not exists task_proofs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade not null,
  caregiver_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('photo', 'audio')),
  file_path text not null,
  created_at timestamptz default now(),
  
  constraint unique_task_proof unique (task_id, caregiver_id)
);

-- Enable RLS
alter table task_proofs enable row level security;

-- Create policies
create policy "Users can insert their own proofs"
on task_proofs for insert
to authenticated
with check (
  caregiver_id = auth.uid()
);

create policy "Users can view their own proofs"
on task_proofs for select
to authenticated
using (
  caregiver_id = auth.uid() OR
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'supervisor'
  )
);

-- Create function to get task proofs
create or replace function get_task_proofs(p_task_id uuid)
returns table (
  id uuid,
  task_id uuid,
  caregiver_id uuid,
  type text,
  file_path text,
  created_at timestamptz,
  caregiver_name text
)
language sql
security definer
as $$
  select 
    tp.id,
    tp.task_id,
    tp.caregiver_id,
    tp.type,
    tp.file_path,
    tp.created_at,
    p.full_name as caregiver_name
  from task_proofs tp
  join profiles p on p.id = tp.caregiver_id
  where tp.task_id = p_task_id;
$$;