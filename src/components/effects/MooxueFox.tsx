'use client';

import React from 'react';

export type FoxMood = 'idle' | 'celebrate' | 'peek' | 'sleep' | 'lazy' | 'praise' | 'hungry' | 'study' | 'wave' | 'alert';
export type FoxStage = 0 | 1 | 2 | 3;

interface MooxueFoxProps {
  mood: FoxMood;
  stage?: FoxStage;
  size?: number;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const MOOD_IMAGE_MAP: Record<string, string> = {
  idle: '/mooxue/idle.png',
  celebrate: '/mooxue/celebrate.png',
  peek: '/mooxue/peek.png',
  sleep: '/mooxue/sleep.png'
};

/**
 * 墨雪狐狸 - 动态图片版
 * 根据 mood 自动切换不同的狐狸表情图片
 */
export default function MooxueFox({
  mood,
  stage = 0,
  size = 96,
  animate = true,
  className,
  style
}: MooxueFoxProps) {
  // 没有对应图片的 mood 都 fallback 到 idle
  const imgSrc = MOOD_IMAGE_MAP[mood] || MOOD_IMAGE_MAP.idle;

  // 动画类名：stage 越高动画越丰富
  const animClass = animate ? `fox-anim-stage-${stage}` : '';

  return (
    <div
      className={`mooxue-fox-container ${animClass} ${className || ''}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        ...style
      }}
    >
      <img
        src={imgSrc}
        alt={`墨雪 - ${mood}`}
        className="mooxue-fox-img"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 2px 4px rgba(45, 74, 62, 0.15))'
        }}
        draggable={false}
      />

      <style>{`
        /* 基础呼吸动画 */
        .mooxue-fox-container .mooxue-fox-img {
          animation: fox-breathe 2.5s ease-in-out infinite;
        }

        @keyframes fox-breathe {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.03) translateY(-2px); }
        }

        /* Stage 0：基础呼吸 */
        .fox-anim-stage-0 .mooxue-fox-img {
          animation: fox-breathe 2.5s ease-in-out infinite;
        }

        /* Stage 1：轻微浮动 */
        .fox-anim-stage-1 .mooxue-fox-img {
          animation: fox-float-1 3s ease-in-out infinite;
        }

        @keyframes fox-float-1 {
          0%, 100% { transform: scale(1) translateY(0) rotate(0deg); }
          25% { transform: scale(1.02) translateY(-3px) rotate(-1deg); }
          75% { transform: scale(1.02) translateY(-3px) rotate(1deg); }
        }

        /* Stage 2：活泼跳动 */
        .fox-anim-stage-2 .mooxue-fox-img {
          animation: fox-bounce-2 2.2s ease-in-out infinite;
        }

        @keyframes fox-bounce-2 {
          0%, 100% { transform: scale(1) translateY(0) rotate(0deg); }
          30% { transform: scale(1.05) translateY(-5px) rotate(-2deg); }
          60% { transform: scale(1.05) translateY(-5px) rotate(2deg); }
        }

        /* Stage 3：九尾灵动 */
        .fox-anim-stage-3 .mooxue-fox-img {
          animation: fox-spirit-3 1.8s ease-in-out infinite;
        }

        @keyframes fox-spirit-3 {
          0%, 100% { transform: scale(1) translateY(0) rotate(0deg); }
          20% { transform: scale(1.06) translateY(-6px) rotate(-3deg); }
          40% { transform: scale(1.06) translateY(-6px) rotate(3deg); }
          60% { transform: scale(1.04) translateY(-3px) rotate(-1deg); }
          80% { transform: scale(1.04) translateY(-3px) rotate(1deg); }
        }

        /* 鼠标悬停放大效果 */
        .mooxue-fox-container:hover .mooxue-fox-img {
          filter: drop-shadow(0 4px 8px rgba(45, 74, 62, 0.25));
          transition: filter 0.3s ease;
        }
      `}</style>
    </div>
  );
}
