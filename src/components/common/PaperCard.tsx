'use client';

import React from 'react';

interface PaperCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function PaperCard({ children, className = '', style }: PaperCardProps) {
  return (
    <div className={`paper-card ${className}`} style={style}>
      {children}
    </div>
  );
}
