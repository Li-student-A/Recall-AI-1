'use client';

import React from 'react';

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function GhostButton({ children, className = '', ...props }: GhostButtonProps) {
  return (
    <button className={`btn-ghost ${className}`} {...props}>
      {children}
    </button>
  );
}
