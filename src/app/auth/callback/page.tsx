'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';

/**
 * Auth 回调页面
 * Supabase 的邮箱验证、密码重置、OAuth 登录都会带 code 参数跳转到这里。
 * 本页负责：
 *   1. exchangeCodeForSession() 把 code 换成 session
 *   2. 根据 next 参数或默认场景跳转到对应页面：
 *        - 密码重置（type=recovery）→ /auth/reset-password
 *        - 邮箱验证（type=signup）→ /dashboard
 *        - 其他场景 → /dashboard
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { message: messageApi } = App.useApp();

  useEffect(() => {
    let cancelled = false;

    const handle = async () => {
      const code = params.get('code');
      const next = params.get('next');
      const type = params.get('type');

      try {
        if (code) {
          const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        if (cancelled) return;

        // 场景分发
        if (type === 'recovery' || next?.includes('reset')) {
          messageApi.success('身份已验证，请设置新密码');
          router.replace('/auth/reset-password');
          return;
        }
        if (type === 'signup') {
          messageApi.success('邮箱已验证，欢迎加入 Recall AI！');
          router.replace(next || '/dashboard');
          return;
        }
        router.replace(next || '/dashboard');
      } catch (err: any) {
        if (cancelled) return;
        const msg = err.message || '';
        console.error('[Auth Callback] 错误:', err);
        if (msg.includes('Invalid') || msg.includes('expired')) {
          messageApi.error('链接已过期，请回到登录页重新发送邮件');
        } else {
          messageApi.error(`登录失败：${msg || '未知错误'}`);
        }
        setTimeout(() => router.replace('/auth/login'), 1200);
      }
    };

    handle();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--paper-bg)',
        color: 'var(--text-secondary)'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid var(--border-line)',
          borderTopColor: 'var(--brand-primary)',
          animation: 'brush-spin 900ms linear infinite'
        }}
      />
      <div style={{ marginTop: 20, fontSize: '14pt' }}>墨雪正在处理登录信息...</div>
      <div style={{ marginTop: 8, fontSize: '11pt' }}>若长时间未跳转，请手动返回<a onClick={() => router.replace('/auth/login')} className="link-paper">登录页</a></div>
      <style>{`@keyframes brush-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
