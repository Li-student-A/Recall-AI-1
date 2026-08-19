/* eslint-disable no-unused-vars */
'use client';

import React from 'react';

interface CheckmarkProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Checkmark({ checked, onChange, label }: CheckmarkProps) {
  return (
    <span
      className={`checkmark ${checked ? 'checked' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      title={label}
    >
      {checked ? '☑' : '□'}
    </span>
  );
}
