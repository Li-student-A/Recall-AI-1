'use client';

import { createClient } from '@supabase/supabase-js';

function validateUrl(url: string): string {
  if (!url) {
    console.error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL 未配置。请在 .env.local 中设置。'
    );
    return '';
  }
  if (!url.startsWith('https://')) {
    console.error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL 格式错误，必须以 https:// 开头。'
    );
    return '';
  }
  if (url.includes('/rest/v1') || url.includes('/auth/v1')) {
    console.error(
      '[Supabase] NEXT_PUBLIC_SUPABASE_URL 不应包含 /rest/v1 或 /auth/v1 路径。请使用项目根地址（如 https://xxx.supabase.co）。'
    );
    return '';
  }
  return url.replace(/\/$/, '');
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = validateUrl(rawUrl);
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
