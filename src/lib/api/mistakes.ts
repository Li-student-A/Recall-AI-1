import { supabaseClient } from '@/lib/supabase/client';
import { PAGE_SIZE } from '@/lib/constants';

export async function getMistakes(params: {
  subject?: string;
  masteryLevel?: string;
  page?: number;
}) {
  const user = await supabaseClient.auth.getUser();
  if (!user.data.user) throw new Error('未登录');

  const { subject, masteryLevel, page = 1 } = params;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabaseClient
    .from('mistakes')
    .select('*', { count: 'exact' })
    .eq('user_id', user.data.user.id)
    .eq('archived', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (subject) query = query.eq('subject', subject);
  if (masteryLevel) query = query.eq('mastery_level', masteryLevel);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: data || [],
    count: count || 0,
    totalPages: Math.ceil((count || 0) / PAGE_SIZE)
  };
}

export async function createMistake(mistake: {
  content: string;
  correct_answer?: string;
  wrong_answer?: string;
  wrong_reason?: string;
  subject?: string;
  tags?: string[];
  mastery_level?: string;
}) {
  const user = await supabaseClient.auth.getUser();
  if (!user.data.user) throw new Error('未登录');

  const { data, error } = await supabaseClient
    .from('mistakes')
    .insert({ user_id: user.data.user.id, ...mistake })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function archiveMistake(id: string) {
  const { error } = await supabaseClient
    .from('mistakes')
    .update({ archived: true })
    .eq('id', id);
  if (error) throw error;
}

export async function batchArchive(ids: string[]) {
  const { error } = await supabaseClient
    .from('mistakes')
    .update({ archived: true })
    .in('id', ids);
  if (error) throw error;
}

export async function deleteMistake(id: string) {
  const { error } = await supabaseClient.from('mistakes').delete().eq('id', id);
  if (error) throw error;
}
