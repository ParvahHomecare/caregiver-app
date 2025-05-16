import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Get current session
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

// Sign in with email and password
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return { data };
};

// Sign up with email and password
export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });
  if (error) throw error;
  return { data };
};

// Sign out
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error };
  }
};

// Fetch user profile
export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return { data, error };
};

// Fetch dashboard statistics
export const fetchDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get active patients count
  const { count: activePatients, error: patientsError } = await supabase
    .from('patients')
    .select('*', { count: 'exact' });

  if (patientsError) throw patientsError;

  // Get caregivers count
  const { count: caregivers, error: caregiversError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .eq('role', 'caregiver');

  if (caregiversError) throw caregiversError;

  // Get today's tasks
  const { data: todayTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .gte('scheduled_time', today.toISOString())
    .lt('scheduled_time', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

  if (tasksError) throw tasksError;

  // Calculate task statistics
  const completedTasks = todayTasks?.filter(task => task.status === 'completed').length || 0;
  const pendingTasks = todayTasks?.filter(task => task.status === 'pending').length || 0;
  const missedTasks = todayTasks?.filter(task => task.status === 'missed').length || 0;

  return {
    data: {
      activePatients: activePatients || 0,
      caregivers: caregivers || 0,
      todayTasks: todayTasks?.length || 0,
      completedTasks,
      pendingTasks,
      missedTasks,
    },
    error: null,
  };
};