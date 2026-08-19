'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    });
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--paper-bg)'
      }}
    >
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
        正在加载 Recall AI...
      </div>
    </div>
  );
}
