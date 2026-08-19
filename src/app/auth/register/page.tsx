'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { App, Progress } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import PaperButton from '@/components/common/PaperButton';
import MooxueFox from '@/components/effects/MooxueFox';

export default function RegisterPage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
  const [focusField, setFocusField] = useState<string | null>(null);

  // 密码强度计算
  const pwdStrength = useMemo(() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s += 25;
    if (password.length >= 10) s += 15;
    if (/[A-Z]/.test(password)) s += 15;
    if (/[0-9]/.test(password)) s += 15;
    if (/[^A-Za-z0-9]/.test(password)) s += 15;
    if (/(.)\1{2,}/.test(password)) s = Math.max(10, s - 10);
    return Math.min(100, s);
  }, [password]);

  const pwdColor =
    pwdStrength < 30 ? '#B33939' : pwdStrength < 60 ? '#D4A373' : pwdStrength < 85 ? '#5B7A5A' : '#2D4A3E';
  const pwdLabel =
    pwdStrength < 30 ? '弱' : pwdStrength < 60 ? '一般' : pwdStrength < 85 ? '良好' : '极佳';

  const flashError = (field: string) => {
    setErrorFields((prev) => new Set(prev).add(field));
    setTimeout(() => {
      setErrorFields((prev) => {
        const n = new Set(prev);
        n.delete(field);
        return n;
      });
    }, 550);
  };

  const handleRegister = async () => {
    let ok = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      flashError('email');
      ok = false;
    }
    if (!password || password.length < 6) {
      flashError('password');
      ok = false;
    }
    if (!confirmPassword || password !== confirmPassword) {
      flashError('confirm');
      ok = false;
    }
    if (!ok) {
      if (!email) messageApi.warning('请填写邮箱');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) messageApi.warning('邮箱格式不正确');
      else if (password.length < 6) messageApi.warning('密码至少 6 位');
      else if (password !== confirmPassword) messageApi.warning('两次密码输入不一致');
      return;
    }

    setLoading(true);
    window.dispatchEvent(new CustomEvent('brush-loading', { detail: true }));
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/login` }
      });

      if (error) {
        if (error.message.includes('Invalid path') || error.message.includes('request URL')) {
          messageApi.error(
            'Supabase 连接失败：请检查 .env.local 中的 NEXT_PUBLIC_SUPABASE_URL 是否为项目根地址（不含 /rest/v1 路径）'
          );
        } else if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          flashError('email');
          messageApi.warning('该邮箱已被注册，请直接登录');
        } else {
          messageApi.error(error.message || '注册失败');
        }
        return;
      }

      if (data.user) {
        if (data.session) {
          messageApi.success('注册成功，已自动登录 ✨');
          router.push('/dashboard');
        } else {
          messageApi.success('注册成功！请查收邮件完成验证后登录');
          router.push('/auth/login');
        }
      }
    } catch (err: any) {
      messageApi.error(err.message || '注册服务异常，请稍后重试');
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('brush-loading', { detail: false }));
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
      {/* 背景装饰 SVG：古籍书页 + 毛笔笔触 */}
      <DecorativeBackground />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 920, display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 0 }} className="auth-grid">
        {/* 左侧插画区 */}
        <div className="auth-illust">
          <div style={{ padding: '48px 40px 56px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: '38pt', fontWeight: 'bold', color: '#2D4A3E', letterSpacing: '0.02em' }}>Recall</span>
                <span style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: '16pt', color: '#D4A373' }}>AI</span>
              </div>
              <p style={{ fontSize: '12pt', color: '#8A7356', marginTop: 4, fontStyle: 'italic', letterSpacing: '0.06em' }}>
                错题重温 · 日拱一卒
              </p>
              <div style={{ marginTop: 34, position: 'relative' }}>
                <RegisterIllustration focusField={focusField} pwdStrength={pwdStrength} />
              </div>
            </div>

            {/* 三个价值点 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '📖', t: '古籍式错题本', d: '纸张质感，沉淀每道错题' },
                { icon: '🦊', t: '墨雪作陪', d: '三尾狐狸陪你打卡进化' },
                { icon: '✨', t: 'AI 变式举一反三', d: '变题、知识、批改一站式' }
              ].map((it) => (
                <div key={it.t} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }} className="auth-hero-item">
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(138,115,86,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    {it.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13pt', fontWeight: 600, color: '#2D4A3E' }}>{it.t}</div>
                    <div style={{ fontSize: '11pt', color: '#8A7356', marginTop: 2 }}>{it.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧表单区 */}
        <div
          className="paper-card auth-form-card"
          style={{ padding: 44, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
        >
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22pt', fontWeight: 'bold', color: 'var(--brand-primary)', margin: 0 }}>
              创建你的错题本
            </h2>
            <p style={{ fontSize: '12pt', color: 'var(--text-secondary)', marginTop: 8 }}>
              只需 30 秒，开启你的 AI 复习之旅
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
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField(null)}
                placeholder="your@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>密码（至少 6 位）</label>
                {password && (
                  <span style={{ fontSize: '10pt', color: pwdColor, fontWeight: 600 }}>
                    强度 · {pwdLabel}
                  </span>
                )}
              </div>
              <input
                className={`input-paper ${errorFields.has('password') ? 'input-error' : ''}`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField(null)}
                placeholder="至少 6 位，建议混合数字与字母"
                autoComplete="new-password"
              />
              {password && (
                <div style={{ marginTop: 8 }}>
                  <Progress
                    percent={pwdStrength}
                    showInfo={false}
                    size="small"
                    strokeColor={pwdColor}
                    trailColor="var(--border-line-light)"
                  />
                </div>
              )}
            </div>

            <div>
              <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>确认密码</label>
              <input
                className={`input-paper ${errorFields.has('confirm') ? 'input-error' : ''}`}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusField('confirm')}
                onBlur={() => setFocusField(null)}
                placeholder="再次输入密码"
                autoComplete="new-password"
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
              />
            </div>

            <PaperButton onClick={handleRegister} disabled={loading} style={{ width: '100%', marginTop: 4, fontSize: '14pt', padding: '12px 24px' }}>
              {loading ? '注册中...' : '开启我的错题本'}
            </PaperButton>

            <div style={{ textAlign: 'center', fontSize: '12pt', color: 'var(--text-secondary)' }}>
              已有账号？
              <Link href="/auth/login" className="link-paper">返回登录</Link>
            </div>
          </div>

          <hr className="divider-paper" style={{ margin: '22px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '10pt', color: 'var(--text-secondary)' }}>
            <span>🔒</span>
            <span>数据 Supabase 加密存储 · 仅你可见</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-illust {
          background:
            linear-gradient(160deg, #FAF3E3 0%, #F1E4CB 45%, #E7D3AF 100%);
          border: 1px solid var(--border-line);
          border-right: none;
          border-radius: 14px 0 0 14px;
          box-shadow: 0 10px 36px rgba(45,74,62,0.12), 0 4px 12px rgba(45,74,62,0.06);
          position: relative;
          overflow: hidden;
        }
        .auth-illust::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><path d='M0 120 Q45 100 90 120 T180 120' stroke='%238A7356' stroke-opacity='0.09' fill='none' stroke-width='1.2'/></svg>");
          opacity: 0.9;
          pointer-events: none;
        }
        .auth-form-card { border-radius: 0 14px 14px 0; box-shadow: 0 10px 36px rgba(45,74,62,0.14), 0 4px 14px rgba(45,74,62,0.08); }
        .auth-hero-item { animation: hero-in 600ms cubic-bezier(0.22,1,0.36,1) both; }
        .auth-hero-item:nth-child(1) { animation-delay: 120ms; }
        .auth-hero-item:nth-child(2) { animation-delay: 240ms; }
        .auth-hero-item:nth-child(3) { animation-delay: 360ms; }
        @keyframes hero-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 900px) {
          .auth-grid { grid-template-columns: 1fr !important; }
          .auth-illust { display: none; }
          .auth-form-card { border-radius: 14px !important; }
        }
      `}</style>
    </div>
  );
}

// 装饰背景：飘落的银杏叶 + 墨点
function DecorativeBackground() {
  return (
    <>
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, opacity: 0.55 }}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="leaf-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F2CC8F" />
            <stop offset="100%" stopColor="#D4A373" />
          </linearGradient>
          <radialGradient id="ink-g" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2D4A3E" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2D4A3E" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="140" r="90" fill="url(#ink-g)" />
        <circle cx="1080" cy="680" r="130" fill="url(#ink-g)" />
        <g style={{ animation: 'bg-drift 30s ease-in-out infinite' }}>
          <path d="M120,320 C150,280 170,260 190,280 C210,300 200,340 170,355 C140,370 90,360 120,320 Z" fill="url(#leaf-g)" opacity="0.35" transform="rotate(-18 150 320)" />
          <path d="M1020,180 C1050,140 1070,120 1090,140 C1110,160 1100,200 1070,215 C1040,230 990,220 1020,180 Z" fill="url(#leaf-g)" opacity="0.28" transform="rotate(24 1050 180)" />
          <path d="M950,700 C980,660 1000,640 1020,660 C1040,680 1030,720 1000,735 C970,750 920,740 950,700 Z" fill="url(#leaf-g)" opacity="0.22" transform="rotate(-8 980 700)" />
        </g>
        <style>{`
          @keyframes bg-drift {
            0%,100% { transform: translate(0,0) rotate(0deg); }
            50% { transform: translate(-20px,16px) rotate(2deg); }
          }
        `}</style>
      </svg>
    </>
  );
}

// 注册插画：小狐狸看你填表
function RegisterIllustration({ focusField, pwdStrength }: { focusField: string | null; pwdStrength: number }) {
  const cover = focusField === 'password' || focusField === 'confirm';
  return (
    <div style={{ position: 'relative', height: 220, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      {/* 古书 */}
      <svg width="320" height="180" viewBox="0 0 320 180">
        {/* 书页底色 */}
        <path
          d="M30 150 C30 130 160 110 160 110 C160 110 290 130 290 150 L290 170 C290 174 286 178 282 178 L38 178 C34 178 30 174 30 170 Z"
          fill="#FBF5E6"
          stroke="#8A7356"
          strokeWidth="1.2"
        />
        {/* 书脊 */}
        <path d="M160 112 L160 178" stroke="#8A7356" strokeWidth="1.4" />
        {/* 横线 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={i}>
            <line x1="42" y1={128 + i * 12} x2="152" y2={128 + i * 12} stroke="#D6C3A0" strokeWidth="0.8" />
            <line x1="168" y1={128 + i * 12} x2="278" y2={128 + i * 12} stroke="#D6C3A0" strokeWidth="0.8" />
          </g>
        ))}
        {/* 填写字段符号 */}
        <text x="54" y="124" fontSize="9" fill="#8A7356" fontFamily="Georgia, serif">✉</text>
        <text x="180" y="124" fontSize="9" fill="#8A7356" fontFamily="Georgia, serif">🔑</text>
      </svg>

      {/* 小狐狸 */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'fox-peek 3.2s ease-in-out infinite'
        }}
      >
        <MooxueFox mood={cover ? 'peek' : 'idle'} stage={1} size={80} />
      </div>

      {/* 遮眼爪（密码框聚焦时） */}
      {cover && (
        <div
          style={{
            position: 'absolute',
            bottom: 132,
            left: 'calc(50% - 42px)',
            display: 'flex',
            gap: 16,
            fontSize: 26,
            animation: 'paws-up 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275) both'
          }}
        >
          <span>🐾</span>
          <span>🐾</span>
        </div>
      )}

      {/* 密码强度反应 */}
      {focusField === 'password' && pwdStrength > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -4,
            right: 20,
            fontSize: 13,
            padding: '4px 10px',
            background: '#FFFDF9',
            border: '1px solid #E2DCD3',
            borderRadius: 20,
            color: pwdStrength < 30 ? '#B33939' : pwdStrength < 60 ? '#8A7356' : '#2D4A3E',
            fontWeight: 600,
            animation: 'fox-in 300ms ease-out'
          }}
        >
          {pwdStrength < 30 ? '再复杂点嘛~' : pwdStrength < 60 ? '不错哦' : pwdStrength < 85 ? '好耶安全！' : '太厉害了🎉'}
        </div>
      )}

      {/* 邮箱提醒 */}
      {focusField === 'email' && (
        <div style={{ position: 'absolute', top: -8, left: 14, fontSize: 14, color: '#8A7356' }}>
          ✍ 记得填常用邮箱
        </div>
      )}

      <style>{`
        @keyframes fox-peek {
          0%,100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-8px) rotate(-2deg); }
        }
        @keyframes paws-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fox-in {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
