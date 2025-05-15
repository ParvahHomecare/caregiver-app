import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from '@env';

const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export const uploadTaskProof = async (taskId, file, proofType) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Upload the file to storage
    const fileExt = file.uri.split('.').pop();
    const fileName = `${taskId}-${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `task-proofs/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('task-proofs')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create the task proof record
    const { error: proofError } = await supabase
      .from('task_proofs')
      .insert({
        task_id: taskId,
        caregiver_id: user.id,
        type: proofType,
        file_path: filePath,
      });

    if (proofError) throw proofError;

    return { error: null };
  } catch (error) {
    console.error('Error in uploadTaskProof:', error);
    return { error };
  }
};

export default supabase;

export { supabase }