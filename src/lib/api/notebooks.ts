import { supabaseClient } from '@/lib/supabase/client';

export async function getNotebooks() {
  const user = await supabaseClient.auth.getUser();
  if (!user.data.user) throw new Error('未登录');
  const { data, error } = await supabaseClient
    .from('notebooks')
    .select('*')
    .eq('user_id', user.data.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createNotebook(name: string, subject?: string) {
  const user = await supabaseClient.auth.getUser();
  if (!user.data.user) throw new Error('未登录');
  const { data, error } = await supabaseClient
    .from('notebooks')
    .insert({ user_id: user.data.user.id, name, subject })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNotebook(id: string) {
  const { error } = await supabaseClient.from('notebooks').delete().eq('id', id);
  if (error) throw error;
}
