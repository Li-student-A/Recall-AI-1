'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { App, Empty, Tag } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import GhostButton from '@/components/common/GhostButton';
import { SUBJECTS, PAGE_SIZE } from '@/lib/constants';

interface Mistake {
  id: string;
  content: string;
  subject: string;
  mastery_level: string;
  created_at: string;
  tags: string[];
  archived: boolean;
}

export default function MistakesListPage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterSubject, setFilterSubject] = useState<string>('');
  // eslint-disable-next-line no-unused-vars
  const [filterMastery, setFilterMastery] = useState<string>('');
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailMistake, setDetailMistake] = useState<Mistake | null>(null);

  // 防重复请求 / 防重复错误弹窗（React StrictMode 下 useEffect 会触发两次）
  const isLoadingRef = useRef(false);
  const lastErrorKeyRef = useRef<string>('');

  useEffect(() => {
    loadMistakes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterSubject, filterMastery]);

  const loadMistakes = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      let query = supabaseClient
        .from('mistakes')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (filterSubject) query = query.eq('subject', filterSubject);
      if (filterMastery) query = query.eq('mastery_level', filterMastery);

      const { data, count, error } = await query;
      if (error) throw error;

      setMistakes(data || []);
      setTotal(count || 0);
    } catch (err: any) {
      console.error('[Mistakes] 加载失败:', err);
      const msg = err.message || '';
      const errKey = `${msg}::${page}::${filterSubject}::${filterMastery}`;
      if (lastErrorKeyRef.current !== errKey) {
        lastErrorKeyRef.current = errKey;
        if (msg.includes('permission denied') || msg.includes('42501')) {
          messageApi.warning('数据库权限未配置，请在 Supabase 后台执行 fix-rls.sql', 8);
        } else if (msg.includes('relation') && msg.includes('does not exist')) {
          messageApi.warning('数据库表尚未创建，请执行 schema.sql', 8);
        } else if (msg.includes('Invalid path') || msg.includes('request URL')) {
          messageApi.error('服务器连接失败，请稍后重试');
        } else {
          messageApi.error('加载错题列表失败');
        }
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const handleBatchDelete = async () => {
    if (selected.length === 0) {
      messageApi.warning('请先选择错题');
      return;
    }
    try {
      const { error } = await supabaseClient
        .from('mistakes')
        .update({ archived: true })
        .in('id', selected);
      if (error) throw error;
      messageApi.success(`已归档 ${selected.length} 道错题`);
      setSelected([]);
      loadMistakes();
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('permission denied') || msg.includes('42501')) {
        messageApi.error('权限不足，请退出后重新登录');
      } else {
        messageApi.error('归档失败，请稍后重试');
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <AppLayout>
      <PageContainer
        title="我的错题本"
        extra={
          <div style={{ display: 'flex', gap: 12 }}>
            <GhostButton onClick={handleBatchDelete}>批量归档</GhostButton>
            <GhostButton onClick={() => router.push('/mistakes/new')}>
              + 新增错题
            </GhostButton>
          </div>
        }
      >
        <PaperCard style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="text-label">筛选：</span>
            <button
              className={`sidebar-nav-item ${!filterSubject ? 'active' : ''}`}
              style={{ borderLeft: 'none', padding: '4px 12px' }}
              onClick={() => {
                setFilterSubject('');
                setPage(1);
              }}
            >
              全部学科
            </button>
            {SUBJECTS.map((s) => (
              <button
                key={s}
                className={`sidebar-nav-item ${filterSubject === s ? 'active' : ''}`}
                style={{ borderLeft: 'none', padding: '4px 12px' }}
                onClick={() => {
                  setFilterSubject(s);
                  setPage(1);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </PaperCard>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            加载中...
          </div>
        ) : mistakes.length === 0 ? (
          <PaperCard>
            <Empty
              description={
                <span style={{ color: 'var(--text-secondary)' }}>
                  暂无错题，点击右上角录入新错题
                </span>
              }
            />
          </PaperCard>
        ) : (
          <div>
            {mistakes.map((mistake) => (
              <PaperCard
                key={mistake.id}
                style={{
                  marginBottom: 12,
                  cursor: 'pointer',
                  borderColor: selected.includes(mistake.id)
                    ? 'var(--brand-primary)'
                    : 'var(--border-line)'
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(mistake.id)}
                    onChange={() => toggleSelect(mistake.id)}
                    style={{ marginTop: 4 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14pt', marginBottom: 8 }}>
                      {mistake.content.length > 80
                        ? mistake.content.slice(0, 80) + '...'
                        : mistake.content}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <Tag
                        color="default"
                        style={{
                          backgroundColor: '#F5F0E8',
                          borderColor: 'var(--border-line)',
                          color: 'var(--text-main)'
                        }}
                      >
                        {mistake.subject}
                      </Tag>
                      {mistake.tags?.map((tag: string) => (
                        <Tag key={tag} style={{ borderColor: 'var(--border-line)' }}>
                          {tag}
                        </Tag>
                      ))}
                      <span className="text-label">
                        {new Date(mistake.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <GhostButton
                      onClick={() => setDetailMistake(mistake)}
                      style={{ padding: '4px 12px', fontSize: '12pt' }}
                    >
                      详情
                    </GhostButton>
                  </div>
                </div>
              </PaperCard>
            ))}

            {total > PAGE_SIZE && (
              <div
                style={{
                  textAlign: 'center',
                  marginTop: 24,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 16,
                  alignItems: 'center'
                }}
              >
                <button
                  className="link-paper"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  style={{
                    fontSize: '12pt',
                    opacity: page === 1 ? 0.5 : 1
                  }}
                >
                  上一页
                </button>
                <span style={{ fontSize: '12pt' }}>
                  {page} / {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button
                  className="link-paper"
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  onClick={() => setPage((p) => p + 1)}
                  style={{
                    fontSize: '12pt',
                    opacity: page >= Math.ceil(total / PAGE_SIZE) ? 0.5 : 1
                  }}
                >
                  下一页
                </button>
              </div>
            )}
          </div>
        )}

        {detailMistake && (
          <div
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: 400,
              backgroundColor: 'var(--card-bg)',
              borderLeft: '1px solid var(--border-line)',
              padding: 24,
              zIndex: 100,
              overflowY: 'auto',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 16
              }}
            >
              <span style={{ fontSize: '16pt', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                错题详情
              </span>
              <button
                className="link-paper"
                onClick={() => setDetailMistake(null)}
              >
                关闭
              </button>
            </div>
            <hr className="divider-paper" />
            <div style={{ marginBottom: 16 }}>
              <div className="text-label">题干</div>
              <div style={{ fontSize: '14pt', lineHeight: 1.6 }}>
                {detailMistake.content}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="text-label">学科</div>
              <div>{detailMistake.subject}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div className="text-label">掌握程度</div>
              <div>{detailMistake.mastery_level || '未标记'}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <GhostButton
                onClick={() =>
                  router.push(`/practice?mistake=${detailMistake.id}`)
                }
              >
                生成变式题
              </GhostButton>
            </div>
          </div>
        )}
      </PageContainer>
    </AppLayout>
  );
}
