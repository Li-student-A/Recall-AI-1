import { createClient } from '@supabase/supabase-js';

/**
 * 服务端 Supabase 客户端
 * - 优先使用 service role key（如果已配置且不是占位符）
 * - 否则 fallback 到 anon key（至少让 API 能执行，RLS 会保证数据隔离）
 * 注意：anon key 模式下用 `auth.getUser(token)` 校验 JWT 也能成功，因为是同一个 Supabase 项目
 */
function validateUrl(url: string): string {
  if (!url) return '';
  if (!url.startsWith('https://')) return '';
  if (url.includes('/rest/v1') || url.includes('/auth/v1')) return '';
  return url.replace(/\/$/, '');
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = validateUrl(rawUrl);
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 如果 service role key 是占位符（your-service-role-key 或太短），就用 anon key 顶上
const isServiceKeyValid = serviceKey && !serviceKey.startsWith('your-') && serviceKey.length >= 20;
const effectiveKey = isServiceKeyValid ? serviceKey : anonKey;

export const supabaseServer = createClient(supabaseUrl, effectiveKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/** 调试用：当前使用的是哪种 key */
export const SUPABASE_SERVER_MODE = isServiceKeyValid ? 'service-role' : 'anon-fallback';
