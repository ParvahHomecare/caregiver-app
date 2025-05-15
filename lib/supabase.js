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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return { error: null };
};

// Fetch user profile
export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return { error };
  }

  return { data };
};

// Fetch user documents
export const fetchUserDocuments = async (userId) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user documents:', error);
    return { error };
  }

  return { data };
};

// Fetch tasks with optional filters
export const fetchTasks = async (caregiverId, date = null) => {
  let query = supabase
    .from('tasks')
    .select(`
      *,
      patients (
        id,
        full_name
      )
    `)
    .order('scheduled_time', { ascending: true });

  // If caregiver ID is provided, filter by it
  if (caregiverId) {
    query = query.eq('caregiver_id', caregiverId);
  }

  // If date is provided, filter tasks for that specific date
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query = query.gte('scheduled_time', startOfDay.toISOString())
                .lte('scheduled_time', endOfDay.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    return { error };
  }

  return { data };
};

// Update task status
export const updateTaskStatus = async (taskId, status) => {
  const updateData = {
    status,
    updated_at: new Date().toISOString()
  };

  // Add completed_at timestamp for completion
  if (status === 'completed') {
    const now = new Date();
    updateData.completed_at = now.toISOString();
    
    // Check if completion is late
    const { data: task } = await supabase
      .from('tasks')
      .select('scheduled_time')
      .eq('id', taskId)
      .single();
      
    if (task && now > new Date(task.scheduled_time)) {
      updateData.status = 'completed_late';
    }
  }
  
  // Clear completed_at when reverting to pending
  if (status === 'pending') {
    updateData.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task status:', error);
    return { error };
  }

  return { data };
};

// Fetch all patients
export const fetchAllPatients = async () => {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching patients:', error);
    return { error };
  }

  return { data };
};

// Fetch all profiles
export const fetchAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    console.error('Error fetching profiles:', error);
    return { error };
  }

  return { data };
};

// Fetch dashboard statistics
export const fetchDashboardStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get active patients count
  const { data: activePatients, error: patientsError } = await supabase
    .from('patients')
    .select('id', { count: 'exact' });

  // Get caregivers count
  const { data: caregivers, error: caregiversError } = await supabase
    .from('profiles')
    .select('id', { count: 'exact' })
    .eq('role', 'caregiver');

  // Get today's tasks
  const { data: todayTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('status')
    .gte('scheduled_time', today.toISOString())
    .lt('scheduled_time', tomorrow.toISOString());

  if (patientsError || caregiversError || tasksError) {
    throw new Error('Error fetching dashboard statistics');
  }

  // Calculate task statistics
  const taskStats = todayTasks?.reduce((acc, task) => {
    switch (task.status) {
      case 'completed':
      case 'completed_late':
        acc.completedTasks++;
        break;
      case 'pending':
        acc.pendingTasks++;
        break;
      case 'missed':
        acc.missedTasks++;
        break;
    }
    return acc;
  }, {
    completedTasks: 0,
    pendingTasks: 0,
    missedTasks: 0
  }) || {
    completedTasks: 0,
    pendingTasks: 0,
    missedTasks: 0
  };

  return {
    data: {
      activePatients: activePatients?.length || 0,
      caregivers: caregivers?.length || 0,
      todayTasks: todayTasks?.length || 0,
      ...taskStats
    }
  };
};

// Fetch caregiver's assigned patients
export const fetchCaregiverPatients = async (caregiverId) => {
  const { data, error } = await supabase
    .from('caregiver_patients')
    .select(`
      patient_id,
      patients (
        id,
        full_name
      )
    `)
    .eq('caregiver_id', caregiverId);

  if (error) {
    console.error('Error fetching caregiver patients:', error);
    return { error };
  }

  // Transform the data to return just the patient information
  const patients = data.map(cp => cp.patients);
  return { data: patients };
};

// Create task schedule
export const createTaskSchedule = async (scheduleData) => {
  const { data, error } = await supabase
    .from('task_schedules')
    .insert(scheduleData)
    .select()
    .single();

  if (error) {
    console.error('Error creating task schedule:', error);
    return { error };
  }

  return { data };
};

// Update task schedule
export const updateTaskSchedule = async (scheduleId, scheduleData) => {
  const { data, error } = await supabase
    .from('task_schedules')
    .update(scheduleData)
    .eq('id', scheduleId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task schedule:', error);
    return { error };
  }

  return { data };
};

// Delete task schedule
export const deleteTaskSchedule = async (scheduleId) => {
  const { error } = await supabase
    .from('task_schedules')
    .delete()
    .eq('id', scheduleId);

  if (error) {
    console.error('Error deleting task schedule:', error);
    return { error };
  }

  return { error: null };
};

// Add new functions for task proofs
export const uploadTaskProof = async (taskId, file, type) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    // Generate unique file path
    const timestamp = new Date().getTime();
    const filePath = `${user.id}/${taskId}/${timestamp}${file.name}`;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('task-proofs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create proof record
    const { data: proofData, error: proofError } = await supabase
      .from('task_proofs')
      .insert({
        task_id: taskId,
        caregiver_id: user.id,
        type,
        file_path: filePath,
      })
      .select()
      .single();

    if (proofError) throw proofError;

    return { data: proofData };
  } catch (error) {
    console.error('Error uploading task proof:', error);
    return { error };
  }
};

export const fetchTaskProofs = async (taskId) => {
  try {
    const { data, error } = await supabase
      .rpc('get_task_proofs', { p_task_id: taskId });

    if (error) throw error;

    // Get signed URLs for each proof
    const proofsWithUrls = await Promise.all(
      data.map(async (proof) => {
        const { data: signedUrl } = await supabase.storage
          .from('task-proofs')
          .createSignedUrl(proof.file_path, 3600); // 1 hour expiry

        return {
          ...proof,
          url: signedUrl?.signedUrl,
        };
      })
    );

    return { data: proofsWithUrls };
  } catch (error) {
    console.error('Error fetching task proofs:', error);
    return { error };
  }
};