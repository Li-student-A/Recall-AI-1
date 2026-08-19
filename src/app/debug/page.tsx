'use client';

import React, { useState } from 'react';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import PaperButton from '@/components/common/PaperButton';
import GhostButton from '@/components/common/GhostButton';

interface TestResult {
  table: string;
  status: 'ok' | 'error' | 'pending';
  message: string;
  rawError?: any;
  count?: number;
}

/**
 * 增强版诊断页面
 * 使用原生 fetch 直接调用 Supabase REST API，绕过 SDK，
 * 这样可以看到最原始的 HTTP 错误信息
 */
export default function DebugPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [fetchResults, setFetchResults] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [fetchRunning, setFetchRunning] = useState(false);
  const [authInfo, setAuthInfo] = useState<string>('未检查');
  const [envInfo, setEnvInfo] = useState<string>('未检查');
  const [sessionInfo, setSessionInfo] = useState<string>('未检查');

  const runDiagnostics = async () => {
    setRunning(true);
    setResults([]);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '未设置';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '未设置';
    setEnvInfo(`URL: ${url}\nANON_KEY: ${anonKey.substring(0, 20)}...`);

    // 检查登录状态
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !authData.user) {
      setAuthInfo(`❌ 未登录（${authError?.message || '无用户'}）`);
      setRunning(false);
      return;
    }
    setAuthInfo(`✅ 已登录\n用户 ID: ${authData.user.id}\n邮箱: ${authData.user.email}`);

    // 检查 session
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const refreshToken = sessionData?.session?.refresh_token;
    setSessionInfo(
      `access_token: ${accessToken ? accessToken.substring(0, 20) + '...' : '（空）'}\n` +
      `refresh_token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : '（空）'}`
    );

    // 逐表测试（使用 SDK）
    const tables = ['user_settings', 'notebooks', 'mistakes', 'practice_questions', 'review_plans', 'review_records', 'ai_usage'];

    for (const table of tables) {
      setResults((prev) => [...prev, { table, status: 'pending', message: '测试中...' }]);
      try {
        const { data, error, count } = await supabaseClient
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          setResults((prev) =>
            prev.map((r) =>
              r.table === table
                ? {
                    table,
                    status: 'error',
                    message: error.message || JSON.stringify(error),
                    rawError: error
                  }
                : r
            )
          );
        } else {
          setResults((prev) =>
            prev.map((r) =>
              r.table === table
                ? { table, status: 'ok', message: '正常', count: count || 0 }
                : r
            )
          );
        }
      } catch (err: any) {
        setResults((prev) =>
          prev.map((r) =>
            r.table === table
              ? { table, status: 'error', message: err?.message || JSON.stringify(err) || '异常', rawError: err }
              : r
          )
        );
      }
    }
    setRunning(false);
  };

  // 使用原生 fetch 直接测试 REST API（绕过 SDK）
  const runFetchTest = async () => {
    setFetchRunning(true);
    setFetchResults([]);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    // 获取 access token
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const testTables = ['user_settings', 'notebooks', 'mistakes'];

    for (const table of testTables) {
      setFetchResults((prev) => [...prev, { table, status: 'pending' }]);
      try {
        const resp = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          }
        });

        const text = await resp.text();
        let parsedData: any;
        try { parsedData = JSON.parse(text); } catch { parsedData = text; }

        if (resp.ok) {
          setFetchResults((prev) =>
            prev.map((r: any) =>
              r.table === table ? {
                ...r,
                status: 'ok',
                httpStatus: resp.status,
                data: Array.isArray(parsedData) ? `${parsedData.length} 条记录` : JSON.stringify(parsedData).substring(0, 200)
              } : r
            )
          );
        } else {
          setFetchResults((prev) =>
            prev.map((r: any) =>
              r.table === table ? {
                ...r,
                status: 'error',
                httpStatus: resp.status,
                httpStatusText: resp.statusText,
                data: typeof parsedData === 'object' ? JSON.stringify(parsedData, null, 2).substring(0, 500) : parsedData.substring(0, 500)
              } : r
            )
          );
        }
      } catch (err: any) {
        setFetchResults((prev) =>
          prev.map((r: any) =>
            r.table === table ? { ...r, status: 'error', error: err?.message || String(err) } : r
          )
        );
      }
    }
    setFetchRunning(false);
  };

  return (
    <AppLayout>
      <PageContainer title="增强版数据库诊断">
        {/* 基础信息 */}
        <PaperCard style={{ marginBottom: 16 }}>
          <div className="section-title">1. 环境与登录</div>
          <pre style={{ fontSize: '12pt', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
{envInfo}
          </pre>
          <pre style={{ fontSize: '12pt', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
{authInfo}
          </pre>
          <pre style={{ fontSize: '11pt', lineHeight: 2, whiteSpace: 'pre-wrap', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
{sessionInfo}
          </pre>
        </PaperCard>

        {/* 操作按钮 */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <PaperButton onClick={runDiagnostics} disabled={running}>
            {running ? '诊断中...' : '① SDK 测试'}
          </PaperButton>
          <GhostButton onClick={runFetchTest} disabled={fetchRunning}>
            {fetchRunning ? '请求中...' : '② 原生 fetch 测试（绕过 SDK）'}
          </GhostButton>
        </div>

        {/* SDK 测试结果 */}
        {results.length > 0 && (
          <PaperCard style={{ marginBottom: 16 }}>
            <div className="section-title">① SDK 测试结果</div>
            {results.map((r) => (
              <ResultRow key={r.table} r={r} />
            ))}
          </PaperCard>
        )}

        {/* 原生 fetch 测试结果 */}
        {fetchResults.length > 0 && (
          <PaperCard style={{ marginBottom: 16 }}>
            <div className="section-title">② 原生 fetch 测试结果（最原始的 HTTP 响应）</div>
            {fetchResults.map((r: any) => (
              <div
                key={r.table}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 8,
                  border: `1px solid ${r.status === 'ok' ? 'rgba(91,122,90,0.3)' : 'rgba(179,57,57,0.3)'}`,
                  backgroundColor: r.status === 'ok' ? 'rgba(91,122,90,0.05)' : 'rgba(179,57,57,0.05)'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13pt', marginBottom: 8 }}>
                  {r.status === 'ok' ? '✅' : '❌'} {r.table}
                  {r.httpStatus && <span style={{ marginLeft: 8, fontSize: '11pt', color: 'var(--text-secondary)' }}>HTTP {r.httpStatus} {r.httpStatusText}</span>}
                </div>
                <pre style={{ fontSize: '11pt', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 200, overflow: 'auto' }}>
{JSON.stringify(r, null, 2)}
                </pre>
              </div>
            ))}
          </PaperCard>
        )}

        {/* 快速测试：直接 SQL */}
        <PaperCard>
          <div className="section-title">3. 快速 SQL 测试</div>
          <div style={{ fontSize: '12pt', marginBottom: 12 }}>
            在 Supabase SQL Editor 中执行以下 SQL，确认表是否真的存在：
          </div>
          <pre
            style={{
              background: 'rgba(45,74,62,0.08)',
              padding: 16,
              borderRadius: 8,
              fontSize: '12pt',
              fontFamily: 'monospace',
              cursor: 'pointer',
              userSelect: 'all'
            }}
            onClick={(e) => {
              const text = e.currentTarget.textContent;
              navigator.clipboard.writeText(text || '');
              alert('已复制到剪贴板，粘贴到 Supabase SQL Editor 执行');
            }}
          >
{`-- 检查表是否存在
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- 检查 RLS 策略
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- 尝试查询一张表
SELECT count(*) FROM public.mistakes;`}
          </pre>
          <div style={{ fontSize: '11pt', color: 'var(--text-secondary)', marginTop: 8 }}>
            点击代码块可复制，粘贴到 Supabase SQL Editor 执行，把结果告诉我
          </div>
        </PaperCard>
      </PageContainer>
    </AppLayout>
  );
}

function ResultRow({ r }: { r: TestResult }) {
  return (
    <div
      style={{
        marginBottom: 8,
        padding: 10,
        borderRadius: 6,
        border: `1px solid ${r.status === 'ok' ? 'rgba(91,122,90,0.3)' : r.status === 'error' ? 'rgba(179,57,57,0.3)' : 'rgba(212,163,115,0.3)'}`,
        backgroundColor: r.status === 'ok' ? 'rgba(91,122,90,0.05)' : r.status === 'error' ? 'rgba(179,57,57,0.05)' : 'rgba(212,163,115,0.05)'
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '13pt', marginBottom: 4 }}>
        {r.status === 'ok' ? '✅' : r.status === 'error' ? '❌' : '⏳'} {r.table}
        {r.status === 'ok' && r.count !== undefined && (
          <span style={{ marginLeft: 8, fontSize: '11pt', color: 'var(--text-secondary)' }}>
            （{r.count} 条数据）
          </span>
        )}
      </div>
      {r.status === 'error' && (
        <>
          <div style={{ fontSize: '12pt', color: 'var(--brand-primary-dark)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            <b>错误信息：</b>{r.message || '（空）'}
          </div>
          {r.rawError && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: '11pt', color: 'var(--text-secondary)' }}>
                查看完整错误对象
              </summary>
              <pre style={{ fontSize: '10pt', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 300, overflow: 'auto' }}>
                {JSON.stringify(r.rawError, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}
    </div>
  );
}
