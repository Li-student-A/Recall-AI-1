'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { App, Input } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import PaperButton from '@/components/common/PaperButton';
import GhostButton from '@/components/common/GhostButton';
import { AI_QUOTA, SUBJECTS } from '@/lib/constants';

interface VariantsQuestion {
  id: string;
  question: string;
  standard_answer: string;
  solution_steps: string[];
}

interface GradingResult {
  correct: boolean;
  score: number;
  feedback: string;
  error_points: string[];
  tips: string;
}

interface MistakeItem {
  id: string;
  content: string;
  subject: string;
  mastery_level: string;
  created_at: string;
  tags: string[];
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#8A7356' }}>加载中...</div>}>
      <PracticeContent />
    </Suspense>
  );
}

function PracticeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message: messageApi } = App.useApp();
  const mistakeId = searchParams.get('mistake');

  const [originalMistake, setOriginalMistake] = useState<any>(null);
  const [variants, setVariants] = useState<VariantsQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quota, setQuota] = useState({ used: 0, limit: AI_QUOTA.FREE_DAILY_GENERATE });

  // 新增：错题列表（用于在本页面直接选错题，不再跳转）
  const [mistakeList, setMistakeList] = useState<MistakeItem[]>([]);
  const [loadingMistakes, setLoadingMistakes] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [idleTimer, setIdleTimer] = useState<number | null>(null);

  useEffect(() => {
    // 如果 URL 带了 mistake 参数，直接加载
    if (mistakeId) {
      loadOriginalMistake(mistakeId);
    } else {
      // 否则加载错题列表供用户选择
      loadMistakeList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mistakeId]);

  // 加载错题列表（本页内选择，不再跳转）
  const loadMistakeList = async () => {
    setLoadingMistakes(true);
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
        .select('id, content, subject, mastery_level, created_at, tags')
        .eq('user_id', user.id)
        .eq('archived', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filterSubject) query = query.eq('subject', filterSubject);

      const { data, error } = await query;
      if (error) throw error;

      // 本地搜索（按内容关键字）
      const filtered = (data || []).filter((m: MistakeItem) =>
        !searchKeyword || m.content.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setMistakeList(filtered);
    } catch (err: any) {
      console.error('[Practice] 加载错题列表失败:', err);
      const msg = err.message || '';
      if (msg.includes('permission denied') || msg.includes('42501')) {
        messageApi.warning('数据库权限未配置，请执行 fix-final.sql', 8);
      } else {
        messageApi.error('加载错题列表失败');
      }
    } finally {
      setLoadingMistakes(false);
    }
  };

  // 用户在列表里点了一道错题 → 直接开始练习（不再跳转 URL）
  const handleSelectMistake = async (id: string) => {
    await loadOriginalMistake(id);
    // 滚动到顶部，方便用户看到题目和操作区
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 返回选错题界面
  const handleBackToList = () => {
    setOriginalMistake(null);
    setVariants([]);
    setUserAnswer('');
    setGradingResult(null);
    loadMistakeList();
  };

  const loadOriginalMistake = async (id: string) => {
    try {
      const { data, error } = await supabaseClient
        .from('mistakes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setOriginalMistake(data);
    } catch (err: any) {
      messageApi.error('加载错题信息失败');
    }
  };

  const generateVariants = useCallback(async () => {
    if (!originalMistake) {
      messageApi.warning('请先选择一道错题');
      return;
    }
    setGenerating(true);
    try {
      // 取当前 session token 用于 API 鉴权
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          mistake_id: originalMistake.id,
          content: originalMistake.content,
          subject: originalMistake.subject,
          tags: originalMistake.tags
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `变式题生成失败（${response.status}）`);
      }
      const data = await response.json();

      if (data.quota_exceeded) {
        messageApi.warning('今日 AI 调用次数已用完，请明天再来或升级会员');
        return;
      }

      setVariants(data.variants || []);
      setCurrentIndex(0);
      setUserAnswer('');
      setGradingResult(null);
      messageApi.success(`已生成 ${data.variants?.length || 0} 道变式题`);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('401') || msg.includes('未登录')) {
        messageApi.error('登录已过期，请重新登录后再试');
      } else {
        messageApi.error(msg || '变式题生成失败');
      }
    } finally {
      setGenerating(false);
    }
  }, [originalMistake]);

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      messageApi.warning('请先填写你的作答');
      return;
    }
    setSubmitting(true);
    try {
      const { data: sessionData } = await supabaseClient.auth.getSession();
      const accessToken = sessionData?.session?.access_token || '';

      const response = await fetch('/api/ai/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          question: variants[currentIndex].question,
          user_answer: userAnswer,
          standard_answer: variants[currentIndex].standard_answer
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `批改失败（${response.status}）`);
      }
      const data = await response.json();
      setGradingResult(data);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('401') || msg.includes('未登录')) {
        messageApi.error('登录已过期，请重新登录后再试');
      } else {
        messageApi.error(msg || '批改失败');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentIndex < variants.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer('');
      setGradingResult(null);
    } else {
      setUserAnswer('');
      setGradingResult(null);
      await generateVariants();
    }
  };

  const addToMistakes = async () => {
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) {
        messageApi.error('登录状态已过期');
        router.push('/auth/login');
        return;
      }
      const { error } = await supabaseClient.from('mistakes').insert({
        user_id: user.id,
        content: variants[currentIndex].question,
        subject: originalMistake?.subject || '其他',
        tags: ['变式题'],
        mastery_level: 'PARTIAL',
        archived: false
      });
      if (error) throw error;
      messageApi.success('已加入错题本');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('permission denied')) {
        messageApi.error('权限不足，请重新登录');
      } else {
        messageApi.error('添加失败：' + msg);
      }
    }
  };

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    const timer = window.setTimeout(() => {
      messageApi.info('墨雪：主人已经 3 分钟没动了，要专心复习哦~');
    }, 3 * 60 * 1000);
    setIdleTimer(timer);
  };

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimer) clearTimeout(idleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAnswer, currentIndex]);

  // 搜索时重新过滤
  useEffect(() => {
    if (!originalMistake) {
      const t = setTimeout(() => loadMistakeList(), 200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKeyword, filterSubject]);

  return (
    <AppLayout>
      <PageContainer
        title="AI 变式练习"
        extra={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="stat-number" style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
              每日 AI 变式剩余 {Math.max(0, quota.limit - quota.used)} 次
            </span>
            {originalMistake && (
              <GhostButton onClick={handleBackToList}>← 重新选题</GhostButton>
            )}
          </div>
        }
      >
        {!originalMistake ? (
          <>
            {/* 空状态：直接显示错题列表 */}
            <PaperCard style={{ marginBottom: 16 }}>
              <div className="section-title">① 从错题本选择一道题开始练习</div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                <Input.Search
                  placeholder="搜索题干关键字"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  style={{ maxWidth: 280 }}
                  allowClear
                />
                <select
                  className="input-paper"
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  style={{ width: 140, padding: '4px 8px' }}
                >
                  <option value="">全部学科</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span style={{ fontSize: '11pt', color: 'var(--text-secondary)' }}>
                  共 {mistakeList.length} 道
                </span>
              </div>

              {loadingMistakes ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>加载中...</div>
              ) : mistakeList.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14pt', marginBottom: 16 }}>
                    {searchKeyword || filterSubject ? '没有匹配的错题，换个关键字试试' : '错题本还是空的，先去录入第一道错题吧'}
                  </p>
                  {!searchKeyword && !filterSubject && (
                    <PaperButton onClick={() => router.push('/mistakes/new')}>+ 新增错题</PaperButton>
                  )}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                  {mistakeList.map((m) => (
                    <div
                      key={m.id}
                      className="practice-mistake-card"
                      onClick={() => handleSelectMistake(m.id)}
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        border: '1px solid var(--border-line)',
                        backgroundColor: 'var(--paper-bg)',
                        cursor: 'pointer',
                        transition: 'all 180ms',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: '10pt', color: 'var(--brand-primary)', fontWeight: 600 }}>
                          {m.subject}
                        </span>
                        <span style={{ fontSize: '10pt', color: 'var(--text-secondary)' }}>
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12pt',
                          lineHeight: 1.5,
                          color: 'var(--text-main)',
                          maxHeight: 60,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {m.content}
                      </div>
                      <div style={{ marginTop: 8, fontSize: '10pt', color: 'var(--brand-primary)' }}>
                        点击开始练习 →
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PaperCard>
          </>
        ) : (
          <>
            <PaperCard style={{ marginBottom: 20 }}>
              <div style={{ fontSize: '12pt', color: 'var(--text-secondary)', marginBottom: 12 }}>
                原题来源：
              </div>
              <div
                style={{
                  fontSize: '14pt',
                  color: 'var(--text-main)',
                  lineHeight: 1.6,
                  maxHeight: 80,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {originalMistake.content}
              </div>
            </PaperCard>

            {variants.length === 0 ? (
              <PaperCard style={{ textAlign: 'center', padding: 40 }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: '13pt' }}>
                  基于这道错题，AI 可以生成同类变式题供练习
                </p>
                <PaperButton onClick={generateVariants} disabled={generating}>
                  {generating ? '生成中...' : '✨ 生成变式题'}
                </PaperButton>
              </PaperCard>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* 左栏：作答区 */}
                <PaperCard>
                  <div className="stat-number" style={{ fontSize: '12pt', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    变式练习 NO.{currentIndex + 1}
                  </div>
                  <div
                    style={{
                      fontSize: '14pt',
                      lineHeight: 1.6,
                      marginBottom: 20,
                      padding: '12px',
                      backgroundColor: 'var(--paper-bg)',
                      border: '1px solid var(--border-line)',
                      borderRadius: 4
                    }}
                  >
                    {variants[currentIndex].question}
                  </div>

                  <div>
                    <label style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                      你的作答：
                    </label>
                    <textarea
                      className="input-paper"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="在此填写你的解题过程和答案"
                      rows={8}
                      style={{
                        resize: 'vertical',
                        borderBottom: '1px solid var(--border-line)',
                        padding: '12px 4px'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                    <PaperButton onClick={handleSubmit} disabled={submitting}>
                      {submitting ? '批改中...' : '提交批改'}
                    </PaperButton>
                    <GhostButton onClick={addToMistakes}>加入错题本</GhostButton>
                  </div>
                </PaperCard>

                {/* 右栏：参考答案与解析 */}
                <PaperCard>
                  {!gradingResult ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                      提交答案后显示参考答案与解析
                    </div>
                  ) : (
                    <>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '12pt', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          原题对照
                        </div>
                        <div style={{ fontSize: '12pt', lineHeight: 1.6, color: 'var(--text-main)', maxHeight: 60, overflow: 'hidden' }}>
                          {originalMistake.content}
                        </div>
                      </div>

                      <hr className="divider-paper" />

                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '12pt', color: 'var(--text-secondary)', marginBottom: 8 }}>
                          标准答案
                        </div>
                        <div style={{ fontSize: '12pt', lineHeight: 1.6 }}>
                          {variants[currentIndex].standard_answer}
                        </div>
                      </div>

                      {gradingResult.error_points && gradingResult.error_points.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '12pt', color: 'var(--danger-red)', marginBottom: 8 }}>
                            错误点解析
                          </div>
                          <ul style={{ fontSize: '12pt', lineHeight: 1.8, paddingLeft: 20 }}>
                            {gradingResult.error_points.map((point, i) => (
                              <li key={i} style={{ color: 'var(--danger-red)' }}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {gradingResult.tips && (
                        <div>
                          <div style={{ fontSize: '12pt', color: 'var(--success-green)', marginBottom: 8 }}>
                            解题技巧
                          </div>
                          <div style={{ fontSize: '12pt', lineHeight: 1.6 }}>
                            {gradingResult.tips}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </PaperCard>
              </div>
            )}

            {variants.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: 24, padding: 16, borderTop: '1px solid var(--border-line)' }}>
                <span className="stat-number" style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
                  练习进度：{currentIndex + 1}/{variants.length} 道变式练习
                </span>
                <div style={{ marginTop: 16 }}>
                  <PaperButton onClick={handleNext}>
                    {currentIndex < variants.length - 1 ? '下一题' : '重新生成'}
                  </PaperButton>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '10pt', color: 'var(--text-secondary)' }}>
              每日 AI 变式生成存在次数上限，会员可解锁更多次数
            </div>
          </>
        )}
      </PageContainer>
    </AppLayout>
  );
}
