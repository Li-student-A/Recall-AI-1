'use client';

import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from '@/styles/theme';
import Sidebar from './Sidebar';
import { supabaseClient } from '@/lib/supabase/client';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [userEmail, setUserEmail] = useState<string | undefined>();

  useEffect(() => {
    supabaseClient.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserEmail(data.user.email || undefined);
      }
    });
  }, []);

  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <AntdApp>
        <Sidebar userEmail={userEmail} />
        <main className="main-content">{children}</main>
      </AntdApp>
    </ConfigProvider>
  );
}
