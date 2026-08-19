'use client';

import React, { useState, useEffect } from 'react';
import BrushCursor from '@/components/effects/BrushCursor';
import MooxuePet from '@/components/effects/MooxuePet';

/**
 * 全局特效层：在 RootLayout 挂载一次，
 * 避免每次路由切换都重新创建 BrushCursor 粒子系统和 MooxuePet 定时器。
 * 这样页面切换会明显更快、更顺滑。
 */
export default function GlobalEffects() {
  const [showBrush, setShowBrush] = useState(true);
  const [showMooxue, setShowMooxue] = useState(true);

  useEffect(() => {
    const savedBrush = localStorage.getItem('recall_brush');
    const savedMooxue = localStorage.getItem('recall_mooxue');
    if (savedBrush !== null) setShowBrush(savedBrush === 'true');
    if (savedMooxue !== null) setShowMooxue(savedMooxue === 'true');
  }, []);

  return (
    <>
      {showBrush && <BrushCursor />}
      <MooxuePet visible={showMooxue} />
    </>
  );
}
