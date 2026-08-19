'use client';

import React from 'react';
import { Button, Result } from 'antd';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; reset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Recall AI Error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.reset?.();
  };

  render() {
    if (this.state.hasError) {
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
            status="warning"
            title="页面出现异常"
            subTitle="抱歉，页面加载时出现了问题。尝试刷新或返回首页。"
            extra={[
              <Button key="retry" type="primary" onClick={this.handleReset}>
                重试
              </Button>,
              <Button key="home" onClick={() => (window.location.href = '/')}>
                返回首页
              </Button>
            ]}
          />
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
