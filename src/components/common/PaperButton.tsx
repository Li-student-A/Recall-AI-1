'use client';

import React from 'react';

interface PaperButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export default function PaperButton({ children, className = '', ...props }: PaperButtonProps) {
  return (
    <button className={`btn-paper ${className}`} {...props}>
      {children}
    </button>
  );
}
