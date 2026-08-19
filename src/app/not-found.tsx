'use client';

import Link from 'next/link';
import { Result } from 'antd';

export default function NotFound() {
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
      <Result
        status="404"
        title="404"
        subTitle="抱歉，你访问的页面不存在"
        extra={
          <Link href="/dashboard" className="link-paper">
            返回首页
          </Link>
        }
      />
    </div>
  );
}
