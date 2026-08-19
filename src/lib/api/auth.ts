import { supabaseClient } from '@/lib/supabase/client';

export async function login(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function register(email: string, password: string) {
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) throw error;
  return data.user;
}
