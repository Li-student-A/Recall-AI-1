import type { Metadata, Viewport } from 'next';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import theme from '@/styles/theme';
import '@/app/globals.css';
import 'katex/dist/katex.min.css';
import GlobalEffects from '@/components/layout/GlobalEffects';

export const metadata: Metadata = {
  title: 'Recall AI 智能错题本',
  description: '错题重温・日拱一卒 — AI 驱动的大学生错题复盘学习工具',
  keywords: 'AI错题本,考研复习,错题管理,艾宾浩斯,学习工具'
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        <ConfigProvider theme={theme} locale={zhCN}>
          <AntdApp>
            <GlobalEffects />
            {children}
          </AntdApp>
        </ConfigProvider>
      </body>
    </html>
  );
}
