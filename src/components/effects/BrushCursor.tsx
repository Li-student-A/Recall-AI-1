'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

const PARTICLE_SPREAD = 22;

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  dx: number;
  dy: number;
  hue: number;
  born: number;
  life: number;
}

let particleSeq = 0;

export default function BrushCursor() {
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isClicking, setIsClicking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTextSel, setIsTextSel] = useState(false);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const loopRef = useRef<((t: number) => void) | null>(null); // eslint-disable-line no-unused-vars
  const [, setTick] = useState(0);

  // 添加粒子
  const spawn = useCallback((x: number, y: number, opts?: { count?: number; bright?: boolean; click?: boolean }) => {
    const count = opts?.count ?? 1;
    const bright = opts?.bright ?? false;
    const click = opts?.click ?? false;
    const newOnes: Particle[] = [];
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = click ? 0.8 + Math.random() * 2 : 0.15 + Math.random() * 0.45;
      const baseSize = click ? 2 + Math.random() * 5 : 1.2 + Math.random() * 2.8;
      newOnes.push({
        id: particleSeq++,
        x: x + (Math.random() - 0.5) * (click ? PARTICLE_SPREAD * 0.8 : PARTICLE_SPREAD * 0.3),
        y: y + (Math.random() - 0.5) * (click ? PARTICLE_SPREAD * 0.8 : PARTICLE_SPREAD * 0.3),
        size: bright ? baseSize * 1.4 : baseSize,
        opacity: click ? 0.95 : bright ? 0.85 : 0.55,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed - (click ? 0.4 : 0.05), // 微微向上
        hue: Math.random() < 0.65 ? 35 : 150, // 金色多，墨玉色少
        born: now,
        life: click ? 800 + Math.random() * 400 : 500 + Math.random() * 500
      });
    }
    particlesRef.current = [...particlesRef.current, ...newOnes];
    if (particlesRef.current.length > 120) {
      particlesRef.current = particlesRef.current.slice(-120);
    }
    // 如果 RAF 未运行，重新启动
    if (!rafRef.current && loopRef.current) {
      rafRef.current = requestAnimationFrame(loopRef.current);
    }
  }, []);

  // 全局粒子更新（requestAnimationFrame）—— 粒子为空时暂停以节省 CPU
  useEffect(() => {
    let last = performance.now();
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      if (particlesRef.current.length > 0) {
        const now = performance.now();
        particlesRef.current = particlesRef.current
          .map((p) => {
            const age = now - p.born;
            const ratio = age / p.life;
            const newP = { ...p };
            newP.x += newP.dx * (dt / 16.6);
            newP.y += newP.dy * (dt / 16.6);
            newP.dx *= 0.96;
            newP.dy = newP.dy * 0.96 + 0.01; // 轻微重力
            newP.opacity = Math.max(0, 0.95 - ratio) * (p.opacity / 0.95);
            newP.size = Math.max(0.5, p.size * (1 - ratio * 0.55));
            return newP;
          })
          .filter((p) => p.opacity > 0.02 && p.size > 0.4);
        setTick((x) => x + 1);
        // 还有粒子时继续下一帧，否则停止 RAF 循环
        if (particlesRef.current.length > 0) {
          rafRef.current = requestAnimationFrame(loop);
        } else {
          rafRef.current = 0;
        }
      }
    };

    // 将 loop 存到 ref 供 ensureRAF 使用
    loopRef.current = loop;

    // 初始启动（如果有残留粒子）
    if (particlesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      const interactive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest(
          'button, a, input, textarea, select, label, [role="button"], [role="link"], [role="tab"], [contenteditable="true"]'
        );
      setIsHovering(!!interactive);

      const sel = window.getSelection();
      setIsTextSel(!!(sel && sel.toString().length > 0));

      // 移动粒子（降低概率以避免性能问题）
      if (Math.random() < (isHovering ? 0.35 : 0.12)) {
        spawn(e.clientX, e.clientY, { bright: !!interactive });
      }
    },
    [isHovering, spawn]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      setIsClicking(true);
      spawn(e.clientX, e.clientY, { count: 10, click: true, bright: true });
    },
    [spawn]
  );

  const handleMouseUp = useCallback(() => setIsClicking(false), []);

  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none)').matches;
    if (isTouch) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.classList.add('brush-cursor-active');
    // 监听全局 loading 信号
    const onLoading = (e: Event) => setIsLoading((e as CustomEvent).detail);
    window.addEventListener('brush-loading', onLoading as EventListener);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('brush-loading', onLoading as EventListener);
      document.body.classList.remove('brush-cursor-active');
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp]);

  // 画笔形状根据状态切换
  const state = isLoading ? 'loading' : isClicking ? 'click' : isHovering ? 'hover' : isTextSel ? 'text' : 'idle';

  return (
    <>
      {/* 画笔主光标 */}
      <div
        style={{
          position: 'fixed',
          left: cursorPos.x,
          top: cursorPos.y,
          pointerEvents: 'none',
          zIndex: 99999,
          transform: `translate(-50%, -85%)
            ${state === 'click' ? 'rotate(-28deg) scale(0.88)' : state === 'hover' ? 'rotate(-18deg) scale(1.05)' : state === 'loading' ? 'rotate(0deg) scale(1)' : 'rotate(-6deg) scale(1)'}`,
          transition: 'transform 120ms cubic-bezier(0.22, 1, 0.36, 1)',
          mixBlendMode: 'multiply'
        }}
      >
        <BrushSvg state={state} />
      </div>

      {/* 粒子层 */}
      {particlesRef.current.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background:
              p.hue < 100
                ? `radial-gradient(circle at 30% 30%, #F2CC8F, #D4A373 60%, #A97C50)`
                : `radial-gradient(circle at 30% 30%, #5B7A5A, #3D5A4E 60%, #1E362C)`,
            boxShadow: `0 0 ${p.size * 2}px ${
              p.hue < 100 ? 'rgba(212,163,115,0.45)' : 'rgba(45,74,62,0.35)'
            }`,
            pointerEvents: 'none',
            opacity: p.opacity,
            transform: 'translate(-50%, -50%)',
            zIndex: 99998,
            filter: 'blur(0.2px)'
          }}
        />
      ))}
    </>
  );
}

function BrushSvg({ state }: { state: 'idle' | 'hover' | 'click' | 'loading' | 'text' }) {
  if (state === 'loading') {
    return (
      <svg width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(45,74,62,0.2)" strokeWidth="2.5" />
        <circle
          cx="16"
          cy="16"
          r="12"
          fill="none"
          stroke="url(#brush-loading-grad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="55 20"
          style={{ transformOrigin: '16px 16px', animation: 'brush-spin 900ms linear infinite' }}
        />
        <defs>
          <linearGradient id="brush-loading-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#D4A373" />
            <stop offset="100%" stopColor="#2D4A3E" />
          </linearGradient>
        </defs>
        <style>{`@keyframes brush-spin { to { transform: rotate(360deg); } }`}</style>
      </svg>
    );
  }
  if (state === 'text') {
    return (
      <svg width="22" height="30" viewBox="0 0 22 30">
        <path d="M3 2 h10 l-3 4 h-7 z" fill="#D4A373" />
        <path d="M10 6 l8 8 l-8 -8 z" fill="#8A7356" opacity="0.5" />
        <path d="M7 6 h6 v20 h-6 z" fill="#2D4A3E" rx="1" />
        <path d="M7 22 h6 v2 h-6 z" fill="#D4A373" />
      </svg>
    );
  }
  const tip =
    state === 'click' ? '14 26 12 20 10 14 12 8' : state === 'hover' ? '14 25 12 18 10 12 12 6' : '14 24 12 17 10 11 12 5';
  return (
    <svg width="28" height="36" viewBox="0 0 28 36">
      {/* 笔杆 */}
      <path d="M11 6 h6 v15 h-6 z" fill="#2D4A3E" rx="1" />
      {/* 笔杆金属环 */}
      <path d="M11 19 h6 v2.2 h-6 z" fill="#D4A373" />
      {/* 笔尖锥 */}
      <path d="M11 21.2 h6 L14 26 z" fill="#8A7356" />
      {/* 笔毛 */}
      <path d={tip} fill={state === 'click' ? '#1E362C' : '#2D4A3E'} opacity="0.92" />
      {/* 笔尖墨滴 */}
      <circle
        cx="14"
        cy={state === 'click' ? 27 : 26}
        r={state === 'click' ? 1.6 : 1.1}
        fill={state === 'hover' ? '#D4A373' : '#1E362C'}
        opacity={state === 'click' ? 0.9 : 0.7}
      />
      {/* 顶部金色装饰 */}
      <circle cx="14" cy="4" r="1.8" fill="#D4A373" />
    </svg>
  );
}
