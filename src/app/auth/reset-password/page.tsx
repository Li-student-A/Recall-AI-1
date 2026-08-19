'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { App } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import PaperButton from '@/components/common/PaperButton';
import GhostButton from '@/components/common/GhostButton';
import MooxueFox from '@/components/effects/MooxueFox';

/**
 * 重置密码页面
 * 流程：用户在登录页点"忘记密码"→ 收到邮件 → 点击链接跳转到这里
 *       → 输入新密码 → 调用 updateUser 更新 → 自动登录跳首页
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { message: messageApi } = App.useApp();

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);
  const [foxMood, setFoxMood] = useState<'idle' | 'praise' | 'peek'>('idle');

  // 检查用户是否已经通过邮件链接中的 token 完成了 session 注入
  const checkedRef = useRef(false);
  const [hasValidSession, setHasValidSession] = useState(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;

    // 如果 URL 上带了 code（OAuth/魔法链接回调），已经由 Supabase SDK 自动处理
    // 这里直接检查 session 是否有效
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setHasValidSession(true);
        setFoxMood('praise');
        messageApi.success('身份验证成功，请输入新密码');
      } else {
        setFoxMood('peek');
        messageApi.warning('请先通过邮件中的链接进入本页，或回到登录页点击「忘记密码」');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReset = async () => {
    if (!password || password.length < 6) {
      messageApi.warning('密码至少 6 位');
      return;
    }
    if (password !== password2) {
      messageApi.warning('两次密码输入不一致');
      return;
    }

    setLoading(true);
    setFoxMood('peek');
    try {
      const { error } = await supabaseClient.auth.updateUser({ password });
      if (error) throw error;

      setFoxMood('praise');
      messageApi.success('🎉 密码已重置，正在进入错题本...');

      setTimeout(() => router.push('/dashboard'), 800);
    } catch (err: any) {
      setFoxMood('idle');
      const msg = err.message || '';
      if (msg.includes('same password')) {
        messageApi.warning('新密码不能与原密码相同');
      } else if (msg.includes('Invalid session') || msg.includes('session')) {
        messageApi.error('链接已失效，请回到登录页重新发送重置邮件');
      } else {
        messageApi.error(`重置失败：${msg || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--paper-bg)',
        padding: 20,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <ResetBgDecor />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 480,
          padding: 40,
          borderRadius: 24,
          background: 'linear-gradient(180deg, #FDFBF7 0%, #FFFDF9 100%)',
          border: '1px solid rgba(138,115,86,0.22)',
          boxShadow: 'var(--shadow-xl)',
          animation: 'content-in 300ms cubic-bezier(0.22, 1, 0.36, 1)'
        }}
        className="paper-card"
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <MooxueFox mood={foxMood} stage={1} size={80} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22pt', fontWeight: 700, color: 'var(--brand-primary)', marginBottom: 8 }}>
            重置密码
          </h1>
          <p style={{ fontSize: '12pt', color: 'var(--text-secondary)', margin: 0 }}>
            {hasValidSession ? '为你的账号设置一个新密码吧~' : '身份未验证，请通过邮件链接进入'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>新密码</label>
            <input
              className="input-paper"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>再次输入</label>
            <input
              className="input-paper"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="与上面保持一致"
              autoComplete="new-password"
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
            />
          </div>

          {/* 密码强度提示 */}
          {password && (
            <div style={{ fontSize: '11pt', color: password.length >= 10 ? 'var(--success-green)' : 'var(--text-secondary)' }}>
              {password.length < 6 && <span>⚠ 密码太短，至少 6 位</span>}
              {password.length >= 6 && password.length < 10 && <span>✓ 长度合格，建议使用 10 位以上更安全</span>}
              {password.length >= 10 && <span>✓✓ 非常棒的密码强度！</span>}
            </div>
          )}

          <PaperButton
            onClick={handleReset}
            disabled={loading || !hasValidSession}
            style={{ width: '100%', fontSize: '14pt', padding: '12px 24px' }}
          >
            {loading ? '正在重置...' : '确认新密码'}
          </PaperButton>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Link href="/auth/login" className="link-paper">← 返回登录</Link>
            <Link href="/auth/register" className="link-paper">注册新账号 →</Link>
          </div>
        </div>

        <hr className="divider-paper" style={{ margin: '22px 0' }} />
        <div style={{ fontSize: '10pt', color: 'var(--text-secondary)', textAlign: 'center' }}>
          🔒 数据均由 Supabase 加密存储，安全可靠
        </div>
      </div>
    </div>
  );
}

function ResetBgDecor() {
  return (
    <>
      {/* 左上角：古籍渐变晕染 */}
      <div
        style={{
          position: 'absolute',
          top: -120,
          left: -120,
          width: 380,
          height: 380,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212,163,115,0.18), transparent 60%)',
          pointerEvents: 'none'
        }}
      />
      {/* 右下角：墨玉色渐变 */}
      <div
        style={{
          position: 'absolute',
          bottom: -160,
          right: -160,
          width: 460,
          height: 460,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,74,62,0.14), transparent 60%)',
          pointerEvents: 'none'
        }}
      />
      {/* 背景纹理 */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none' }}>
        <pattern id="paper-grain" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="none" />
          <circle cx="20" cy="30" r="1" fill="#8A7356" />
          <circle cx="150" cy="80" r="0.8" fill="#8A7356" />
          <circle cx="80" cy="160" r="1.2" fill="#8A7356" />
          <circle cx="180" cy="180" r="1" fill="#8A7356" />
          <circle cx="40" cy="120" r="0.7" fill="#2D4A3E" />
          <circle cx="120" cy="40" r="0.9" fill="#2D4A3E" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#paper-grain)" />
      </svg>
    </>
  );
}
