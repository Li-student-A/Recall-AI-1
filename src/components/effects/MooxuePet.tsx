'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import MooxueFox, { FoxMood, FoxStage } from './MooxueFox';

type MooxueMood = FoxMood;

interface MooxuePetProps {
  visible: boolean;
  streakDays?: number;
  mistakesCount?: number;
}

const STAGE_TIPS: Record<number, string> = {
  0: '主人今天也要加油复习哦~',
  1: '连续打卡 7 天！墨雪长出了更多尾巴~',
  2: '连续打卡 30 天！墨雪尾巴闪闪发光~',
  3: '累计 500 题 + 60 天打卡！九尾显形！'
};

const RANDOM_INTERACT_TIPS = [
  '主人，别只顾着刷题，也要记得喝水呀~',
  '这道题有点难呢，要不要先从基础复习起？',
  '听说最近错题有点多？别焦虑，慢慢来~',
  '已经学习 30 分钟了，站起来活动活动吧！',
  '错题本越厚，收获越大哦！坚持住~',
  '主人今天的字真好看！',
  '要不要挑战一下变式训练？超有趣的~',
  '每一道错题，都是通往满分的台阶呀~'
];

export default function MooxuePet({ visible, streakDays = 0, mistakesCount = 0 }: MooxuePetProps) {
  const [mood, setMood] = useState<MooxueMood>('idle');
  const [, setTip] = useState('主人，今天也要加油复习哦~');
  const [displayText, setDisplayText] = useState('主人，今天也要加油复习哦~');
  const [isTyping, setIsTyping] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const tipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const evolutionStage: FoxStage =
    mistakesCount >= 500 && streakDays >= 60
      ? 3
      : streakDays >= 30
      ? 2
      : streakDays >= 7
      ? 1
      : 0;

  const tailCount = evolutionStage === 0 ? 1 : evolutionStage === 1 ? 3 : evolutionStage === 2 ? 5 : 9;

  // 打字机效果
  const typeText = useCallback((text: string) => {
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    setIsTyping(true);
    setDisplayText('');
    let idx = 0;
    typingTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= text.length) {
        setDisplayText(text);
        setIsTyping(false);
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      } else {
        setDisplayText(text.slice(0, idx));
      }
    }, 55);
  }, []);

  // 说话（带打字机 + 自动隐藏气泡）
  const say = useCallback(
    (text: string, durationMs = 4800, nextMood?: MooxueMood) => {
      setShowTip(true);
      setTip(text);
      typeText(text);
      if (nextMood) setMood(nextMood);
      if (tipTimeoutRef.current) clearTimeout(tipTimeoutRef.current);
      tipTimeoutRef.current = setTimeout(() => {
        setShowTip(false);
        setTimeout(() => setMood('idle'), 400);
      }, durationMs);
    },
    [typeText]
  );

  // 点击墨雪：多种反应 + 随机鼓励
  const handleClick = useCallback(() => {
    setBounce(true);
    setTimeout(() => setBounce(false), 500);
    const reactions: Array<{ mood: MooxueMood; text: string }> = [
      { mood: 'praise', text: RANDOM_INTERACT_TIPS[Math.floor(Math.random() * RANDOM_INTERACT_TIPS.length)] },
      { mood: 'celebrate', text: '和主人互动超开心！今天也要元气满满~' },
      { mood: 'hungry', text: '墨雪有点饿了…主人学累了也记得吃点东西呀' },
      { mood: 'study', text: '陪主人一起刷题，咱们一块儿进步！' },
      { mood: 'praise', text: `现在已经有 ${mistakesCount} 道错题了呢，厚积薄发！` }
    ];
    const pick = reactions[Math.floor(Math.random() * reactions.length)];
    say(pick.text, 5200, pick.mood);
  }, [say, mistakesCount]);

  // 随机心情切换 + 定时说话
  useEffect(() => {
    const moods: MooxueMood[] = ['idle', 'lazy', 'alert', 'sleep', 'hungry', 'study'];
    const moodTimer = setInterval(() => {
      if (showTip) return;
      const nextMood = moods[Math.floor(Math.random() * moods.length)];
      setMood(nextMood);

      if (Math.random() < 0.25) {
        say(RANDOM_INTERACT_TIPS[Math.floor(Math.random() * RANDOM_INTERACT_TIPS.length)], 4200, nextMood);
      }
    }, 22000);
    return () => clearInterval(moodTimer);
  }, [say, showTip]);

  // 进化时的特别庆祝
  useEffect(() => {
    const tipText = STAGE_TIPS[evolutionStage] || STAGE_TIPS[0];
    if (evolutionStage > 0) {
      setTimeout(() => {
        say(tipText, 6000, 'celebrate');
      }, 1200);
    } else {
      setTip(tipText);
      setTimeout(() => typeText(tipText), 400);
    }
  }, [evolutionStage, say, typeText]);

  if (!visible) return null;

  return (
    <div className="mooxue-container" onClick={handleClick} style={{ cursor: 'pointer' }}>
      {/* 墨雪本体 */}
      <div
        style={{
          position: 'relative',
          width: 120,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          transform: bounce ? 'scale(0.92)' : 'scale(1)',
          transition: 'transform 180ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          animation: 'mooxue-float 3.5s ease-in-out infinite'
        }}
      >
        {/* 尾巴光环 */}
        {evolutionStage >= 1 && (
          <div
            style={{
              position: 'absolute',
              inset: -12,
              borderRadius: '50%',
              background:
                evolutionStage >= 3
                  ? 'radial-gradient(circle, rgba(212,163,115,0.35), transparent 70%)'
                  : evolutionStage >= 2
                  ? 'radial-gradient(circle, rgba(45,74,62,0.22), transparent 70%)'
                  : 'radial-gradient(circle, rgba(212,163,115,0.18), transparent 65%)',
              filter: 'blur(5px)',
              animation: 'mooxue-glow 3s ease-in-out infinite'
            }}
          />
        )}

        {/* SVG 狐狸本体 */}
        <MooxueFox
          mood={mood}
          stage={evolutionStage}
          size={120}
          animate={true}
          style={{
            position: 'relative',
            zIndex: 2,
            transition: 'transform 300ms ease'
          }}
        />

        {/* 装饰小元素 */}
        {mood === 'celebrate' && (
          <>
            <span style={{ position: 'absolute', left: -4, top: 8, fontSize: 14, animation: 'mooxue-spin 1.2s linear infinite' }}>✨</span>
            <span style={{ position: 'absolute', right: -4, top: 6, fontSize: 12, animation: 'mooxue-spin 1.5s linear infinite reverse' }}>⭐</span>
            <span style={{ position: 'absolute', left: 50, top: -8, fontSize: 10 }}>🎊</span>
          </>
        )}
        {mood === 'praise' && (
          <span style={{ position: 'absolute', right: -6, top: 0, fontSize: 14 }}>💫</span>
        )}
        {mood === 'sleep' && (
          <span style={{ position: 'absolute', right: -4, top: -8, fontSize: 16, animation: 'mooxue-breathe 2s ease-in-out infinite' }}>💤</span>
        )}
        {mood === 'alert' && (
          <span style={{ position: 'absolute', left: '50%', top: -20, transform: 'translateX(-50%)', fontSize: 14, animation: 'mooxue-bounce-little 0.8s ease-in-out infinite' }}>❗</span>
        )}
      </div>

      {/* 尾巴数量徽章 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          marginTop: -8,
          marginBottom: 8
        }}
      >
        {Array.from({ length: tailCount }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: 8,
              opacity: 0.5 + i * 0.15,
              transform: `rotate(${(i - (tailCount - 1) / 2) * 18}deg) translateY(-3px)`,
              transition: 'transform 300ms ease',
              filter: i === tailCount - 1 ? 'drop-shadow(0 0 3px rgba(212,163,115,0.6))' : 'none'
            }}
          >
            🪶
          </span>
        ))}
      </div>

      {/* 对话气泡 */}
      {showTip && (
        <div
          style={{
            position: 'relative',
            margin: '0 auto',
            padding: '10px 14px',
            background: 'linear-gradient(145deg, #FFFDF9 0%, #F9F3E7 100%)',
            border: '1px solid var(--border-line)',
            borderRadius: 10,
            borderTopLeftRadius: 2,
            fontSize: '12pt',
            color: 'var(--text-main)',
            maxWidth: 220,
            minWidth: 160,
            textAlign: 'left',
            boxShadow: '0 6px 20px rgba(45,74,62,0.12), 0 2px 6px rgba(45,74,62,0.05)',
            opacity: showTip ? 1 : 0,
            transform: showTip ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.92)',
            transformOrigin: 'top right',
            transition: 'opacity 300ms ease, transform 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            lineHeight: 1.5
          }}
        >
          {/* 气泡箭头 */}
          <div
            style={{
              position: 'absolute',
              top: -8,
              right: 26,
              width: 14,
              height: 14,
              background: '#FFFDF9',
              borderTop: '1px solid var(--border-line)',
              borderLeft: '1px solid var(--border-line)',
              transform: 'rotate(45deg)'
            }}
          />
          <span className={isTyping ? 'typewriter-cursor' : ''}>{displayText}</span>
        </div>
      )}

      {/* 提示小字 */}
      {!showTip && (
        <div
          style={{
            textAlign: 'center',
            fontSize: '10pt',
            color: 'var(--text-placeholder)',
            marginTop: 8,
            opacity: 0.7,
            userSelect: 'none'
          }}
        >
          点我和墨雪说话 ✨
        </div>
      )}

      <style>{`
        @keyframes mooxue-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(-0.6deg); }
          75% { transform: translateY(-7px) rotate(0.6deg); }
        }
        @keyframes mooxue-glow {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes mooxue-breathe {
          0%, 100% { opacity: 0.6; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes mooxue-bounce-little {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-4px); }
        }
        @keyframes mooxue-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
