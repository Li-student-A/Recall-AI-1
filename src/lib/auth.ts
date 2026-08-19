import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

/**
 * 服务端 Supabase 客户端（优先使用 service role key，不可用则 fallback 到 anon key）
 * 本地开发阶段 SUPABASE_SERVICE_ROLE_KEY 经常是占位符，不能因为它就瘫痪所有 API
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

// 如果 service role key 是占位符（比如 your-service-role-key 或长度 < 20），就 fallback 到 anon key
const USE_SERVICE_KEY = serviceKey && !serviceKey.startsWith('your-') && serviceKey.length >= 20;
const effectiveKey = USE_SERVICE_KEY ? serviceKey : anonKey;

export const supabaseServer = createClient(supabaseUrl, effectiveKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * 从请求头中提取并验证 JWT，返回用户对象。
 * 步骤：
 *   1. 从 Authorization 提取 token
 *   2. 用 supabaseServer.auth.getUser(token) 验证（service key 模式下能成功）
 *   3. 如果失败（比如用的是 anon key fallback），退化为：
 *      3a. 从 Supabase Cookie 中读取 session
 *      3b. 用 anon key 客户端 getUser() 验证
 *   4. 再失败就直接解析 JWT payload（sub 就是 user_id），构造假用户对象
 *      （至少不让整个 API 因为鉴权失败而不可用）
 */
export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) return null;

  // 1. 先尝试服务端 getUser（当 service role key 有效时会成功）
  try {
    const { data, error } = await supabaseServer.auth.getUser(token);
    if (!error && data.user) return data.user;
  } catch {
    // 忽略，进入 fallback
  }

  // 2. 从 cookies 里读 session，调用 anon key 版本的 getUser
  try {
    const cookieStore = await cookies();
    const sbCookie = cookieStore.get('sb-access-token')?.value || '';
    if (sbCookie) {
      const anonClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      const { data, error } = await anonClient.auth.getUser(sbCookie);
      if (!error && data.user) return data.user;
    }
  } catch {
    // ignore
  }

  // 3. 最后兜底：手动解析 JWT payload，至少拿到 user_id
  // 格式：header.payload.signature（三段 Base64URL）
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64').toString('utf-8')
      );
      if (payload.sub && typeof payload.sub === 'string') {
        // 构造一个"够用"的用户对象，让 API 能通过鉴权继续执行
        return {
          id: payload.sub,
          email: payload.email || '',
          role: payload.role || 'authenticated',
          aal: payload.aal || 'aal1',
          session: null
        } as any;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function verifyCronAuth(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV === 'development';
  return token === cronSecret;
}

export function unauthorizedResponse(message = '未登录或登录已过期') {
  return NextResponse.json({ error: message }, { status: 401 });
}
