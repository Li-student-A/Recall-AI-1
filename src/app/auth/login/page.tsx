'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { App, Checkbox } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import PaperButton from '@/components/common/PaperButton';
import MooxueFox from '@/components/effects/MooxueFox';

const WELCOME_TIPS = [
  '欢迎回来，墨雪想你啦~',
  '今天的错题，是明天的满分哦！',
  '久坐累了？先深呼吸一下吧~',
  '保持节奏，你已经比昨天更强了！',
  '一起来复习，不让错题陪你过夜~'
];

export default function LoginPage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
  const [tip] = useState(() => WELCOME_TIPS[Math.floor(Math.random() * WELCOME_TIPS.length)]);
  const [foxMood, setFoxMood] = useState<'idle' | 'wave' | 'peek'>('wave');

  const flashError = useCallback((field: string) => {
    setErrorFields((prev) => new Set(prev).add(field));
    setTimeout(() => {
      setErrorFields((prev) => {
        const n = new Set(prev);
        n.delete(field);
        return n;
      });
    }, 550);
  }, []);

  const handleLogin = async () => {
    let ok = true;
    if (!email) {
      flashError('email');
      messageApi.warning('请输入邮箱');
      ok = false;
    }
    if (!password || password.length < 6) {
      flashError('password');
      if (ok) messageApi.warning(!password ? '请输入密码' : '密码至少 6 位');
      ok = false;
    }
    if (!ok) return;

    setLoading(true);
    window.dispatchEvent(new CustomEvent('brush-loading', { detail: true }));
    setFoxMood('peek');
    try {
      // 先清掉可能存在的旧 session，避免旧 token 导致 RLS 权限错乱
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {
        // ignore
      }
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        setFoxMood('idle');
        if (error.message.includes('Invalid path') || error.message.includes('request URL')) {
          messageApi.error('Supabase 连接失败：请检查 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL 是否配置正确');
        } else if (error.message.includes('Invalid login credentials')) {
          flashError('password');
          flashError('email');
          messageApi.error('邮箱或密码错误');
        } else {
          messageApi.error(error.message || '登录失败');
        }
        return;
      }
      setFoxMood('wave');
      messageApi.success('登录成功，墨雪等你好久啦！🦊');
      router.push('/dashboard');
    } catch (err: any) {
      setFoxMood('idle');
      messageApi.error(err.message || '登录服务异常，请稍后重试');
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('brush-loading', { detail: false }));
    }
  };

  const handleSendCode = async () => {
    if (!email) {
      flashError('email');
      messageApi.warning('请先输入邮箱');
      return;
    }
    messageApi.info('验证码登录功能开发中，请使用密码登录');
  };

  const handleForgotPassword = async () => {
    if (!email) {
      flashError('email');
      messageApi.warning('请先输入邮箱，再点击忘记密码');
      return;
    }
    const hide = messageApi.loading('正在发送重置邮件...', 0);
    setFoxMood('peek');
    try {
      const redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : undefined;
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      hide();
      if (error) throw error;
      messageApi.success('✉ 重置链接已发送到邮箱，请打开邮件点击链接改密码');
      setFoxMood('wave');
    } catch (err: any) {
      hide();
      setFoxMood('idle');
      const msg = err.message || '';
      if (msg.includes('signup') || msg.includes('User not found')) {
        messageApi.error('该邮箱未注册，请先注册一个新账号');
      } else if (msg.includes('rate limit') || msg.includes('429')) {
        messageApi.error('发送过于频繁，请 60 秒后再试');
      } else if (msg.includes('Invalid path') || msg.includes('request URL')) {
        messageApi.error('服务器连接失败，请稍后重试');
      } else {
        messageApi.error(`发送失败：${msg || '未知错误'}`);
      }
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
      {/* 背景装饰（与注册页一致） */}
      <LoginBackgroundDecor />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 920, display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 0 }} className="auth-grid">
        {/* 左侧表单区 */}
        <div
          className="paper-card auth-form-card"
          style={{ padding: 48, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
        >
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '28pt', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                Recall
              </span>
              <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '14pt', color: 'var(--warning-gold)' }}>
                AI
              </span>
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20pt', fontWeight: 600, color: 'var(--brand-primary)', margin: '18px 0 0' }}>
              欢迎回来
            </h2>
            <p style={{ fontSize: '12pt', color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
              {tip}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>邮箱</label>
              <input
                className={`input-paper ${errorFields.has('email') ? 'input-error' : ''}`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>密码</label>
                <a
                  className="link-paper"
                  onClick={handleForgotPassword}
                  style={{ fontSize: '11pt' }}
                >
                  忘记密码？发邮件重置
                </a>
              </div>
              <input
                className={`input-paper ${errorFields.has('password') ? 'input-error' : ''}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位"
                autoComplete="current-password"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Checkbox
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ color: 'var(--text-secondary)', fontSize: '12pt' }}
              >
                记住我
              </Checkbox>
            </div>

            <PaperButton onClick={handleLogin} disabled={loading} style={{ width: '100%', fontSize: '14pt', padding: '12px 24px', marginTop: 2 }}>
              {loading ? '登录中...' : '开始今天的复习'}
            </PaperButton>

            <div style={{ textAlign: 'center' }}>
              <a className="link-paper" onClick={handleSendCode} style={{ fontSize: '12pt' }}>
                ✉  收验证码登录（开发中）
              </a>
            </div>

            <div style={{ textAlign: 'center', fontSize: '12pt', color: 'var(--text-secondary)' }}>
              还没有账号？
              <Link href="/auth/register" className="link-paper">立即注册</Link>
            </div>
          </div>

          <hr className="divider-paper" style={{ margin: '22px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '10pt', color: 'var(--text-secondary)' }}>
            <span>📜</span>
            <span>登录即同意「服务条款」与「隐私政策」</span>
          </div>
        </div>

        {/* 右侧插画区 */}
        <div className="auth-illust-right">
          <div style={{ padding: '48px 40px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '14pt', color: '#8A7356', letterSpacing: '0.08em' }}>
                Mooxue · 墨雪
              </div>
              <div style={{ fontSize: '10pt', color: '#8A7356', marginTop: 4, opacity: 0.8 }}>
                你的专属三尾狐狸错题伴读
              </div>
            </div>

            {/* 墨雪书桌插画 */}
            <div style={{ position: 'relative', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LoginFoxIllustration mood={foxMood} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(255,255,255,0.45)', border: '1px solid rgba(138,115,86,0.25)', borderRadius: 12, padding: '16px 18px', backdropFilter: 'blur(4px)' }}>
              {[
                { k: '今日任务', v: '待复习错题清单整理完毕' },
                { k: '陪伴奖励', v: '连续打卡可解锁进化形态' },
                { k: 'AI 辅助', v: '批改 · 知识 · 变式一站式' }
              ].map((it, i) => (
                <div key={it.k} className="login-feat-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, animationDelay: `${80 + i * 120}ms` }}>
                  <span style={{ color: 'var(--warning-gold)', marginTop: 2 }}>✦</span>
                  <div>
                    <div style={{ fontSize: '12pt', fontWeight: 600, color: '#2D4A3E' }}>{it.k}</div>
                    <div style={{ fontSize: '11pt', color: '#8A7356' }}>{it.v}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-illust-right {
          background: linear-gradient(200deg, #F4EAD5 0%, #E9D7B2 50%, #D8BD8C 100%);
          border: 1px solid var(--border-line);
          border-left: none;
          border-radius: 0 14px 14px 0;
          box-shadow: 0 10px 36px rgba(45,74,62,0.12), 0 4px 12px rgba(45,74,62,0.06);
          position: relative;
          overflow: hidden;
        }
        .auth-illust-right::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><path d='M0 140 Q50 110 100 140 T200 140' stroke='%238A7356' stroke-opacity='0.1' fill='none' stroke-width='1.2'/></svg>");
          pointer-events: none;
        }
        .auth-form-card { border-radius: 14px 0 0 14px; box-shadow: 0 10px 36px rgba(45,74,62,0.14), 0 4px 14px rgba(45,74,62,0.08); }
        .login-feat-item { animation: hero-in 500ms cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes hero-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-illust-right { display: none; }
          .auth-form-card { border-radius: 14px !important; }
        }
      `}</style>
    </div>
  );
}

// 墨雪书桌插画
function LoginFoxIllustration({ mood }: { mood: 'idle' | 'wave' | 'peek' }) {
  return (
    <div style={{ position: 'relative', width: 280 }}>
      {/* 桌子阴影 */}
      <div style={{ position: 'absolute', bottom: 4, left: 16, right: 16, height: 20, background: 'radial-gradient(ellipse at center, rgba(45,74,62,0.25), transparent 70%)', filter: 'blur(3px)' }} />
      {/* 桌面木 */}
      <svg width="280" height="230" viewBox="0 0 280 230">
        {/* 桌面木纹 */}
        <rect x="0" y="170" width="280" height="50" fill="#B89571" rx="4" />
        <path d="M10 182 Q70 186 140 182 T270 182" stroke="#9C7A56" strokeWidth="0.8" fill="none" opacity="0.55" />
        <path d="M10 194 Q80 198 150 194 T270 194" stroke="#9C7A56" strokeWidth="0.6" fill="none" opacity="0.5" />
        {/* 桌腿 */}
        <rect x="18" y="218" width="14" height="14" fill="#9C7A56" />
        <rect x="248" y="218" width="14" height="14" fill="#9C7A56" />

        {/* 打开的古籍 */}
        <g style={{ transformOrigin: '130px 160px' }}>
          <path d="M36 160 L36 106 C36 98 130 86 130 86 C130 86 224 98 224 106 L224 160 Z" fill="#FBF5E6" stroke="#8A7356" strokeWidth="1.2" />
          <path d="M130 88 L130 160" stroke="#8A7356" strokeWidth="1.2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i}>
              <line x1="50" y1={112 + i * 10} x2="122" y2={112 + i * 10} stroke="#D6C3A0" strokeWidth="0.8" />
              <line x1="138" y1={112 + i * 10} x2="210" y2={112 + i * 10} stroke="#D6C3A0" strokeWidth="0.8" />
            </g>
          ))}
          {/* 写的字 */}
          <text x="70" y="102" fontSize="7" fill="#8A7356" fontFamily="Georgia, serif">Recall...</text>
          <text x="150" y="102" fontSize="7" fill="#8A7356" fontFamily="Georgia, serif">2026.8</text>
        </g>

        {/* 墨水罐 */}
        <g transform="translate(16,142)">
          <ellipse cx="14" cy="0" rx="14" ry="4" fill="#2D4A3E" opacity="0.8" />
          <path d="M2 0 L6 28 L22 28 L26 0 Z" fill="#1E362C" />
          <ellipse cx="14" cy="0" rx="10" ry="2.5" fill="#3D5A4E" />
        </g>

        {/* 毛笔（搁在书上） */}
        <g transform="rotate(-28 190 96)">
          <rect x="190" y="80" width="56" height="6" fill="#2D4A3E" rx="2" />
          <rect x="244" y="80" width="8" height="6" fill="#D4A373" />
          <path d="M188 74 L190 92 L182 96 Z" fill="#1E362C" />
        </g>

        {/* 小印章 */}
        <g transform="translate(224,144)">
          <rect width="22" height="22" fill="#B33939" rx="3" />
          <text x="11" y="16" textAnchor="middle" fontSize="10" fill="#FFF" fontFamily="Georgia" fontWeight="bold">学</text>
        </g>
      </svg>

      {/* 墨雪在桌前 */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: `translateX(-50%) ${mood === 'wave' ? 'rotate(-3deg)' : mood === 'peek' ? 'translateY(-10px) scale(1.04)' : ''}`,
          transition: 'transform 400ms cubic-bezier(0.22,1,0.36,1)',
          animation: 'fox-bob 3s ease-in-out infinite'
        }}
      >
        <MooxueFox mood={mood} stage={2} size={100} />
      </div>

      {/* 挥手 */}
      {mood === 'wave' && (
        <div
          style={{
            position: 'absolute',
            bottom: 96,
            right: 54,
            fontSize: 26,
            transformOrigin: 'bottom center',
            animation: 'fox-wave 1.2s ease-in-out infinite'
          }}
        >
          👋
        </div>
      )}

      {/* 偷看气泡 */}
      {mood === 'peek' && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 6,
            fontSize: 13,
            background: '#FFFDF9',
            border: '1px solid #E2DCD3',
            borderRadius: 14,
            padding: '6px 12px',
            color: '#8A7356',
            fontWeight: 600,
            animation: 'fox-in 300ms ease-out',
            boxShadow: '0 3px 10px rgba(45,74,62,0.1)'
          }}
        >
          唔…再确认一下密码哦~
        </div>
      )}

      <style>{`
        @keyframes fox-bob {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-6px) rotate(1deg); }
        }
        @keyframes fox-wave {
          0%,100% { transform: rotate(-12deg); }
          50% { transform: rotate(18deg); }
        }
        @keyframes fox-in {
          from { opacity: 0; transform: scale(0.88) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// 背景装饰：与注册页类似的飘落风格
function LoginBackgroundDecor() {
  return (
    <svg
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, opacity: 0.5 }}
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="l-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F2CC8F" />
          <stop offset="100%" stopColor="#C69B64" />
        </linearGradient>
        <radialGradient id="l-ink" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2D4A3E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#2D4A3E" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="1100" cy="120" r="110" fill="url(#l-ink)" />
      <circle cx="120" cy="700" r="140" fill="url(#l-ink)" />
      <g style={{ animation: 'bg-drift 28s ease-in-out infinite' }}>
        <path d="M900,120 C930,80 950,60 970,80 C990,100 980,140 950,155 C920,170 870,160 900,120 Z" fill="url(#l-leaf)" opacity="0.3" transform="rotate(14 930 120)" />
        <path d="M160,140 C190,100 210,80 230,100 C250,120 240,160 210,175 C180,190 130,180 160,140 Z" fill="url(#l-leaf)" opacity="0.28" transform="rotate(-20 190 140)" />
      </g>
      <style>{`
        @keyframes bg-drift {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          50% { transform: translate(18px,-14px) rotate(-1.5deg); }
        }
      `}</style>
    </svg>
  );
}
