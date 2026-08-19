'use client';

import React from 'react';

export default function PageContainer({
  title,
  children,
  extra
}: {
  title?: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24
          }}
        >
          {title && <h1 className="page-title" style={{ marginBottom: 0 }}>{title}</h1>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}
