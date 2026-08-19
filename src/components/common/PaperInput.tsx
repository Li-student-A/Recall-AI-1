'use client';

import React from 'react';

interface PaperInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function PaperInput({ label, className = '', ...props }: PaperInputProps) {
  return (
    <div>
      {label && <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>{label}</label>}
      <input className={`input-paper ${className}`} {...props} />
    </div>
  );
}
