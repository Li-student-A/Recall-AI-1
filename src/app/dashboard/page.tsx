'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { App, Progress } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import Checkmark from '@/components/common/Checkmark';
import PaperButton from '@/components/common/PaperButton';
import GhostButton from '@/components/common/GhostButton';
import MooxueFox from '@/components/effects/MooxueFox';

interface ReviewTask {
  id: string;
  mistake_id: string;
  mistake_content: string;
  subject: string;
  due_date: string;
  completed: boolean;
}

interface SubjectStat { subject: string; count: number; completed: number; masteryPct?: number; }

const STREAK_MOTIVATION: Record<number, string> = {
  0: '新的起点，今日开卷！',
  1: '昨日已打卡，继续保持~',
  3: '连续 3 天！好习惯在养成',
  7: '一周不缺席！墨雪长出一尾✨',
  14: '半月坚持！成效已现',
  30: '满月修炼！双尾光芒闪耀🌟',
  60: '双月苦功！三尾召唤在即',
  100: '百日进化！墨雪完全体🎊'
};

function motivationFor(days: number): string {
  const keys = Object.keys(STREAK_MOTIVATION).map(Number).sort((a, b) => b - a);
  for (const k of keys) if (days >= k) return STREAK_MOTIVATION[k];
  return STREAK_MOTIVATION[0];
}

export default function DashboardPage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [todayMistakeCount, setTodayMistakeCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);

  // 防重复请求 / 防重复错误弹窗（React StrictMode 下 useEffect 会触发两次）
  const isLoadingRef = useRef(false);
  const hasShownErrorRef = useRef(false);

  // 汇总统计：今日有复习任务 → 按复习任务计算；没有 → 按今日录入错题数计算
  const summary = useMemo(() => {
    const total = stats.completed + stats.pending;
    // 没有复习任务时，用"今日录入错题数"作为进度依据（至少有反馈，不会永远是 0）
    const effectiveTotal = total > 0 ? total : todayMistakeCount;
    const effectiveCompleted = total > 0 ? stats.completed : todayMistakeCount;
    const progress = effectiveTotal === 0 ? 0 : Math.round((effectiveCompleted / effectiveTotal) * 100);
    const overdue = tasks.filter((t) => !t.completed && new Date(t.due_date) < new Date()).length;
    return { total: effectiveTotal, progress, overdue };
  }, [tasks, stats, todayMistakeCount]);

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboard = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      // 今日截止时间
      const today = new Date(); today.setHours(23, 59, 59, 999);
      const today0 = new Date(); today0.setHours(0, 0, 0, 0);

      // 并行请求：全部错题（含掌握度） + 全部复习计划（含 mistake_id 用于自愈） + 今日复习记录
      const [mistakeRes, allPlanRes, reviewRecRes] = await Promise.all([
        supabaseClient
          .from('mistakes')
          .select('id, subject, mastery_level, created_at, archived')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('review_plans')
          .select('id, mistake_id, completed, next_review_at, mistakes(subject)')
          .eq('user_id', user.id),
        supabaseClient
          .from('review_records')
          .select('created_at')
          .eq('user_id', user.id)
      ]);

      if (mistakeRes.error) throw mistakeRes.error;
      if (allPlanRes.error) throw allPlanRes.error;

      const mistakes = (mistakeRes.data as any[]) || [];
      const activeMistakes = mistakes.filter((m) => !m.archived);
      const totalMistakeCount = activeMistakes.length;

      // === 数据自愈：为缺少复习计划的历史错题补建 review_plans ===
      // 早期版本录入错题时未自动创建复习计划，导致今日清单永远为空。
      // 这里自动检测并补建，让历史错题也能出现在今日复习清单里。
      const allPlans = (allPlanRes.data || []) as any[];
      const existingPlanMistakeIds = new Set(allPlans.map((r) => r.mistake_id));
      const mistakesNeedingPlan = activeMistakes.filter(
        (m) => !existingPlanMistakeIds.has(m.id)
      );

      if (mistakesNeedingPlan.length > 0) {
        try {
          const { calculateReviewPlan } = await import('@/lib/ebbinghaus');
          const plansToInsert = mistakesNeedingPlan.map((m) => {
            const level =
              m.mastery_level && m.mastery_level !== '' ? m.mastery_level : 'TOTAL';
            const plan = calculateReviewPlan(m.id, level as any);
            return {
              user_id: user.id,
              mistake_id: m.id,
              next_review_at: plan.nextReviewAt,
              stage: plan.stage,
              mastery_level: plan.masteryLevel,
              completed: false
            };
          });
          const { error: bulkError } = await supabaseClient
            .from('review_plans')
            .insert(plansToInsert);
          if (!bulkError) {
            // 同步修复 mistakes 表中空字符串的 mastery_level
            await Promise.all(
              mistakesNeedingPlan
                .filter((m) => !m.mastery_level || m.mastery_level === '')
                .map((m) =>
                  supabaseClient
                    .from('mistakes')
                    .update({ mastery_level: 'TOTAL' })
                    .eq('id', m.id)
                )
            );
            console.info(`[Dashboard] 已自动补建 ${plansToInsert.length} 条复习计划`);
          } else {
            console.warn('[Dashboard] 补建复习计划失败:', bulkError.message);
          }
        } catch (healErr) {
          console.warn('[Dashboard] 自愈逻辑异常:', healErr);
        }
      }

      // 查询今日复习计划（在自愈之后，确保补建的错题也能立即显示）
      const planRes = await supabaseClient
        .from('review_plans')
        .select('id, mistake_id, next_review_at, completed, mistakes(content, subject)')
        .eq('user_id', user.id)
        .lte('next_review_at', today.toISOString())
        .order('next_review_at', { ascending: true });

      if (planRes.error) throw planRes.error;

      // 今日复习清单（来自 review_plans 表）
      const formatted: ReviewTask[] =
        planRes.data?.map((it: any) => ({
          id: it.id,
          mistake_id: it.mistake_id,
          mistake_content: it.mistakes?.content || '未命名错题',
          subject: it.mistakes?.subject || '其他',
          due_date: it.next_review_at,
          completed: !!it.completed
        })) || [];

      setTasks(formatted);

      // 今日复习进度：今日有复习任务 → 按 completed/total 计算；今日没有复习任务 → 按 mistakes 总数模拟"录入进度"
      // 这样保证：只要你录入错题，进度就会有变化，不会永远是 0
      const todayCompleted = formatted.filter((t) => t.completed).length;
      const todayTotal = formatted.length;
      setStats({
        completed: todayCompleted,
        pending: todayTotal
      });

      setTotalMistakes(totalMistakeCount);

      // 今日录入的错题数（用于无复习任务时的进度展示，保证录入即有反馈）
      const todayStr = new Date().toDateString();
      const todayCount = activeMistakes.filter(
        (m) => new Date(m.created_at).toDateString() === todayStr
      ).length;
      setTodayMistakeCount(todayCount);

      // 学科掌握度：直接从 mistakes 表统计（按 mastery_level 计算掌握率）
      // mastery_level: TOTAL=完全不会(0%) / PARTIAL=半知半解(50%) / CARELESS=粗心失误(85%)
      // 完成复习计划后 mastery_level 也会升级 → 真正与行为联动
      const MASTERY_WEIGHT: Record<string, number> = {
        TOTAL: 0,
        PARTIAL: 50,
        CARELESS: 85
      };
      const bySubject = new Map<string, { count: number; masterySum: number }>();
      activeMistakes.forEach((m) => {
        const subj = m.subject || '其他';
        const cur = bySubject.get(subj) || { count: 0, masterySum: 0 };
        cur.count += 1;
        cur.masterySum += MASTERY_WEIGHT[m.mastery_level] ?? 25;
        bySubject.set(subj, cur);
      });

      // 同时统计 review_plans 完成情况，作为额外加分
      const planBySubject = new Map<string, { total: number; completed: number }>();
      (allPlanRes.data || []).forEach((r: any) => {
        const subj = r.mistakes?.subject || '其他';
        const cur = planBySubject.get(subj) || { total: 0, completed: 0 };
        cur.total += 1;
        if (r.completed) cur.completed += 1;
        planBySubject.set(subj, cur);
      });

      setSubjectStats(
        Array.from(bySubject.entries()).map(([subject, v]) => {
          const masteryPct = v.count === 0 ? 0 : Math.round(v.masterySum / v.count);
          // 如果该学科有复习计划完成数据，再额外加成
          const planInfo = planBySubject.get(subject);
          let finalPct = masteryPct;
          if (planInfo && planInfo.total > 0) {
            const planBonus = Math.round((planInfo.completed / planInfo.total) * 15); // 最多加 15%
            finalPct = Math.min(100, masteryPct + planBonus);
          }
          return {
            subject,
            count: v.count,
            completed: Math.round((finalPct / 100) * v.count), // 估算已掌握数
            masteryPct: finalPct
          } as any;
        }).sort((a, b) => b.count - a.count)
      );

      // 连续打卡：根据 review_records 中连续有记录的天数计算
      // 如果没有 review_records，就用 mistakes 表中"今天是否录入过错题"作为打卡依据
      const allRecords = (reviewRecRes.data as any[]) || [];
      let streakCount = 0;

      if (allRecords.length > 0) {
        // 计算连续打卡天数（从今天往前推）
        const recordDays = new Set(
          allRecords.map((r) => new Date(r.created_at).toDateString())
        );
        const checkDate = new Date();
        // 如果今天还没复习记录，但今天录入过错题，也算打卡
        const hasTodayMistake = activeMistakes.some(
          (m) => new Date(m.created_at).toDateString() === checkDate.toDateString()
        );
        if (!recordDays.has(checkDate.toDateString()) && !hasTodayMistake) {
          // 今天还没任何活动，从昨天开始算
          checkDate.setDate(checkDate.getDate() - 1);
        }
        while (recordDays.has(checkDate.toDateString()) || (streakCount === 0 && hasTodayMistake)) {
          streakCount += 1;
          checkDate.setDate(checkDate.getDate() - 1);
          if (streakCount === 1 && !recordDays.has(checkDate.toDateString())) break;
        }
      } else if (totalMistakeCount > 0) {
        // 没有 review_records，但有错题 → 至少算 1 天打卡
        streakCount = 1;
      }

      setStreak(streakCount);
    } catch (err: any) {
      console.error('[Dashboard] 加载失败:', err);
      if (!hasShownErrorRef.current) {
        hasShownErrorRef.current = true;
        const msg = err.message || '';
        if (msg.includes('permission denied') || msg.includes('42501')) {
          // RLS 权限错误：不要 signOut（会造成登录→被踢→再登录的死循环），
          // 而是提示用户去 Supabase 执行 fix-rls.sql
          messageApi.warning(
            '数据库权限未配置，数据暂时无法加载。请在 Supabase 后台执行 fix-rls.sql，然后刷新页面',
            8
          );
        } else if (msg.includes('relation') && msg.includes('does not exist')) {
          messageApi.warning(
            '数据库表尚未创建，请在 Supabase 后台执行 schema.sql 和 fix-rls.sql',
            8
          );
        } else if (msg.includes('Invalid path') || msg.includes('request URL')) {
          messageApi.error('Supabase 连接失败，请检查 .env.local 配置');
        } else {
          messageApi.error(`加载失败：${msg || '未知错误'}`);
        }
      }
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  const toggleTask = async (task: ReviewTask) => {
    try {
      const willComplete = !task.completed;
      const { error } = await supabaseClient
        .from('review_plans')
        .update({ completed: willComplete })
        .eq('id', task.id);
      if (error) throw error;

      // 完成复习时：1) 记录一条 review_records（用于连续打卡统计）
      //           2) 升级该错题的 mastery_level（用于学科掌握度增长）
      if (willComplete) {
        setShowConfetti(task.id);

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          // 记录今日复习行为
          await supabaseClient.from('review_records').insert({
            user_id: user.id,
            mistake_id: task.mistake_id,
            review_date: new Date().toISOString().split('T')[0],
            stage: 1
          }).then(({ error: recErr }) => {
            if (recErr) console.warn('[Dashboard] review_records 插入失败:', recErr.message);
          });

          // 升级掌握度：TOTAL → PARTIAL → CARELESS
          // 先查当前 mastery
          const { data: mistake } = await supabaseClient
            .from('mistakes')
            .select('mastery_level')
            .eq('id', task.mistake_id)
            .single();
          if (mistake) {
            const UPGRADE_MAP: Record<string, string> = {
              TOTAL: 'PARTIAL',
              PARTIAL: 'CARELESS',
              CARELESS: 'CARELESS'
            };
            const newMastery = UPGRADE_MAP[mistake.mastery_level] || 'PARTIAL';
            if (newMastery !== mistake.mastery_level) {
              await supabaseClient
                .from('mistakes')
                .update({ mastery_level: newMastery })
                .eq('id', task.mistake_id)
                .then(({ error: updErr }) => {
                  if (updErr) console.warn('[Dashboard] 掌握度升级失败:', updErr.message);
                });
            }
          }
        }
      }
      setTimeout(() => setShowConfetti(null), 900);

      messageApi.success(willComplete ? '完成一题，棒棒哒~ 🎉' : '已标记为未完成');
      loadDashboard();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('permission denied') || msg.includes('42501')) {
        messageApi.error('权限不足，请退出后重新登录');
      } else {
        messageApi.error('更新失败，请稍后重试');
      }
    }
  };

  return (
    <AppLayout>
      <PageContainer
        title="今日待复习"
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
              本周已完成 <b style={{ color: 'var(--success-green)' }}>{stats.completed}</b> 道 · 剩余 <b style={{ color: 'var(--brand-primary)' }}>{stats.pending}</b> 道
            </span>
            <GhostButton onClick={() => router.push('/calendar')}>查看日历</GhostButton>
          </div>
        }
      >
        {/* 统计卡片区 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }} className="stat-grid">
          <StatCard
            icon="📚"
            title="错题总量"
            value={totalMistakes}
            hint="沉淀每一道错过的题"
            color="#2D4A3E"
            delay="0ms"
          />
          <StatCard
            icon="🔥"
            title="连续打卡"
            value={streak}
            suffix="天"
            hint={motivationFor(streak)}
            color="#D4A373"
            delay="80ms"
            highlight
          />
          <StatCard
            icon="🎯"
            title="今日进度"
            value={summary.progress}
            suffix="%"
            hint={`完成 ${stats.completed} / ${summary.total} 道`}
            color="#5B7A5A"
            delay="160ms"
            showProgress={summary.progress}
          />
          <StatCard
            icon={summary.overdue > 0 ? '⏰' : '🪷'}
            title={summary.overdue > 0 ? '待优先复习' : '全部按时'}
            value={summary.overdue}
            hint={summary.overdue > 0 ? '加油，别让错题久等啦~' : '节奏完美，继续保持！'}
            color={summary.overdue > 0 ? '#B33939' : '#8A7356'}
            delay="240ms"
            pulse={summary.overdue > 0}
          />
        </div>

        {/* 复习进度条 */}
        <PaperCard style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="section-title" style={{ marginBottom: 0 }}>今日复习进度</span>
            <span style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
              {summary.total > 0 ? (
                <>距离完成还差 <b style={{ color: 'var(--brand-primary)' }}>{summary.total - stats.completed}</b> 题</>
              ) : <>暂无任务，去录入新错题吧</>}
            </span>
          </div>
          <Progress
            percent={summary.progress}
            strokeColor={{ from: '#2D4A3E', to: '#5B7A5A' }}
            trailColor="var(--border-line-light)"
            size="small"
          />
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', fontSize: '11pt', color: 'var(--text-secondary)' }}>
            <LegendTag color="#5B7A5A" label={`已完成 ${stats.completed}`} />
            <LegendTag color="#D4A373" label={`待复习 ${stats.pending - summary.overdue}`} />
            {summary.overdue > 0 && <LegendTag color="#B33939" label={`超期 ${summary.overdue}`} />}
          </div>
        </PaperCard>

        {/* 学科完成度 */}
        {subjectStats.length > 0 && (
          <PaperCard style={{ marginBottom: 24 }}>
            <div className="section-title" style={{ marginBottom: 16 }}>各学科掌握度</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(subjectStats.length, 4)}, 1fr)`, gap: 16 }} className="subject-grid">
              {subjectStats.map((s, i) => {
                const pct = s.masteryPct ?? (s.count === 0 ? 0 : Math.round((s.completed / s.count) * 100));
                return (
                  <div
                    key={s.subject}
                    style={{
                      padding: 16,
                      background: 'linear-gradient(145deg, var(--card-bg-deep), #F6F0E3)',
                      border: '1px solid var(--border-line)',
                      borderRadius: 8,
                      transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
                      animation: `card-fade-in 500ms cubic-bezier(0.22,1,0.36,1) ${80 + i * 80}ms both`
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)', fontSize: '13pt' }}>{s.subject}</span>
                      <span className="stat-number" style={{ fontSize: '18pt', color: pct >= 70 ? 'var(--success-green)' : pct >= 40 ? 'var(--warning-gold)' : 'var(--danger-red)' }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="progress-track" style={{ marginTop: 10 }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: '11pt', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>共 {s.count} 题</span>
                      <span>已掌握 {s.completed}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </PaperCard>
        )}

        {/* 复习清单 */}
        <PaperCard>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid var(--border-line)'
            }}
          >
            <span style={{ fontSize: '16pt', color: 'var(--brand-primary)', fontWeight: 600 }}>
              📜 复习清单
            </span>
            <span style={{ fontSize: '12pt', color: 'var(--text-secondary)' }}>
              剩余 AI 调用次数：今日配额内
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 22, height: 22, borderRadius: 4 }} />
                  <div className="skeleton" style={{ flex: 1, height: 20 }} />
                  <div className="skeleton" style={{ width: 80, height: 16 }} />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <EmptyDashboardIllustration onNew={() => router.push('/mistakes/new')} />
          ) : (
            <div>
              {Object.entries(
                tasks.reduce<Record<string, ReviewTask[]>>((acc, task) => {
                  if (!acc[task.subject]) acc[task.subject] = [];
                  acc[task.subject].push(task);
                  return acc;
                }, {})
              ).map(([subject, subjectTasks]) => (
                <div key={subject} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: '14pt',
                      fontWeight: 'bold',
                      color: 'var(--brand-primary)',
                      marginBottom: 8,
                      paddingBottom: 4,
                      borderBottom: '1px solid var(--border-line)',
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>{subject}</span>
                    <span style={{ fontSize: '11pt', fontWeight: 400, color: 'var(--text-secondary)' }}>
                      {subjectTasks.filter(t => t.completed).length} / {subjectTasks.length}
                    </span>
                  </div>
                  {subjectTasks.map((task, idx) => {
                    const isOverdue = new Date(task.due_date) < new Date() && !task.completed;
                    return (
                      <div
                        key={task.id}
                        className={`review-card ${showConfetti === task.id ? 'card-hit' : ''}`}
                        style={{
                          animationDelay: `${idx * 60}ms`,
                          background: task.completed
                            ? 'linear-gradient(90deg, rgba(91,122,90,0.06), transparent 80%)'
                            : undefined
                        }}
                      >
                        {showConfetti === task.id && <MiniConfetti />}
                        <Checkmark
                          checked={task.completed}
                          onChange={() => toggleTask(task)}
                        />
                        <div className="review-preview" style={{ textDecoration: task.completed ? 'line-through' : 'none', opacity: task.completed ? 0.7 : 1 }}>
                          {isOverdue && <span className="overdue-dot" />}
                          {task.mistake_content.length > 50
                            ? task.mistake_content.slice(0, 50) + '…'
                            : task.mistake_content}
                        </div>
                        <div className="review-meta">
                          <span style={{ opacity: isOverdue ? 1 : 0.75 }}>
                            {isOverdue && <span style={{ color: 'var(--danger-red)', fontWeight: 600 }}>超期 · </span>}
                            {formatRelative(task.due_date)}
                          </span>
                          <a
                            className="link-paper"
                            style={{ fontSize: '12pt' }}
                            onClick={() => router.push(`/practice?mistake=${task.mistake_id}`)}
                          >
                            开始复习 →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </PaperCard>

        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: '12pt',
            color: 'var(--text-secondary)'
          }}
        >
          本周完成复习题量：<b style={{ color: 'var(--success-green)' }}>{stats.completed}</b> 道 · 继续加油~
        </div>

        <button
          className="fab"
          onClick={() => router.push('/mistakes/new')}
          title="录入新错题"
        >
          +
        </button>
      </PageContainer>

      <style jsx>{`
        .stat-grid { grid-template-columns: repeat(4, 1fr); }
        .subject-grid { }
        @media (max-width: 1100px) {
          .stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .subject-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: 1fr !important; }
          .subject-grid { grid-template-columns: 1fr !important; }
        }
        .card-hit {
          animation: card-hit-bounce 600ms cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }
        @keyframes card-hit-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(0.985); background: linear-gradient(90deg, rgba(91,122,90,0.2), rgba(91,122,90,0.04)); }
          100% { transform: scale(1); }
        }
      `}</style>
    </AppLayout>
  );
}

// === 统计卡片 ===
function StatCard({
  icon, title, value, suffix = '', hint, color, delay = '0ms', highlight = false,
  showProgress, pulse = false
}: {
  icon: string; title: string; value: number; suffix?: string; hint: string;
  color: string; delay?: string; highlight?: boolean; showProgress?: number; pulse?: boolean;
}) {
  return (
    <div
      className="paper-card"
      style={{
        position: 'relative',
        padding: '18px 18px 18px 72px',
        animationDelay: delay,
        borderColor: highlight ? 'rgba(212,163,115,0.45)' : undefined,
        boxShadow: highlight ? '0 4px 14px rgba(212,163,115,0.22), 0 2px 6px rgba(45,74,62,0.06)' : undefined,
        overflow: 'hidden'
      }}
    >
      {/* 图标胶囊 */}
      <div
        style={{
          position: 'absolute',
          left: 18,
          top: 18,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${color}22)`,
          border: `1px solid ${color}33`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          animation: pulse ? 'stat-pulse 2.2s ease-in-out infinite' : undefined
        }}
      >
        {icon}
      </div>

      <div style={{ fontSize: '11pt', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 4, gap: 4 }}>
        <span className="stat-number" style={{ fontSize: '26pt', color }}>{value}</span>
        <span style={{ fontSize: '11pt', color: 'var(--text-secondary)' }}>{suffix}</span>
      </div>
      <div style={{ fontSize: '10.5pt', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.4, minHeight: 28 }}>
        {hint}
      </div>

      {typeof showProgress === 'number' && (
        <div className="progress-track" style={{ marginTop: 10 }}>
          <div className="progress-fill" style={{ width: `${showProgress}%` }} />
        </div>
      )}

      {highlight && (
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(212,163,115,0.25), transparent 65%)',
            animation: 'stat-glow 3s ease-in-out infinite',
            pointerEvents: 'none'
          }}
        />
      )}

      <style>{`
        @keyframes stat-pulse {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 ${color}33; }
          50% { transform: scale(1.05); box-shadow: 0 0 0 6px ${color}11; }
        }
        @keyframes stat-glow {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}

// === 空状态插画 ===
function EmptyDashboardIllustration({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 280, height: 220, marginBottom: 20 }}>
        <svg width="280" height="220" viewBox="0 0 280 220">
          {/* 桌面 */}
          <rect x="20" y="170" width="240" height="40" fill="#B89571" rx="4" />
          <path d="M30 180 Q100 188 180 180 T260 180" stroke="#9C7A56" strokeWidth="0.8" fill="none" opacity="0.6" />
          {/* 空白古书 */}
          <g>
            <path d="M60 160 L60 92 C60 84 140 72 140 72 C140 72 220 84 220 92 L220 160 Z" fill="#FFFDF9" stroke="#8A7356" strokeWidth="1.2" />
            <path d="M140 74 L140 160" stroke="#8A7356" strokeWidth="1.2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <g key={i} opacity="0.4">
                <line x1="72" y1={100 + i * 14} x2="132" y2={100 + i * 14} stroke="#D6C3A0" strokeDasharray="3 3" />
                <line x1="148" y1={100 + i * 14} x2="208" y2={100 + i * 14} stroke="#D6C3A0" strokeDasharray="3 3" />
              </g>
            ))}
            <text x="92" y="88" fontSize="8" fill="#B0ABA4" fontFamily="Georgia" fontStyle="italic">待录入...</text>
          </g>
          {/* 墨雪 */}
          <g style={{ transformOrigin: '140px 140px' }}>
            <foreignObject x="102" y="92" width="76" height="84">
              <div style={{ animation: 'dash-fox 3s ease-in-out infinite' }}>
                <MooxueFox mood="idle" stage={1} size={72} />
              </div>
            </foreignObject>
          </g>
          {/* 墨罐 */}
          <rect x="28" y="144" width="26" height="26" fill="#1E362C" rx="3" />
          <circle cx="41" cy="144" r="10" fill="#3D5A4E" />
          {/* 毛笔 */}
          <g transform="rotate(-24 218 120)">
            <rect x="200" y="108" width="52" height="5" fill="#2D4A3E" rx="2" />
            <rect x="248" y="108" width="8" height="5" fill="#D4A373" />
            <path d="M198 102 L200 118 L192 122 Z" fill="#1E362C" />
          </g>
          {/* 飘墨 */}
          <circle cx="250" cy="50" r="8" fill="#2D4A3E" opacity="0.12" />
          <circle cx="36" cy="40" r="10" fill="#D4A373" opacity="0.2" />
        </svg>
        <style>{`
          @keyframes dash-fox {
            0%,100% { transform: translateY(0) rotate(-1deg); }
            50% { transform: translateY(-5px) rotate(1.5deg); }
          }
        `}</style>
      </div>

      <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18pt', color: 'var(--brand-primary)', margin: '0 0 8px' }}>
        今日暂无复习任务
      </h3>
      <p style={{ fontSize: '12pt', color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 420 }}>
        看来你的错题本还空空如也~ 从录入第一道错题开始，让墨雪陪你一起整理吧！
      </p>
      <div style={{ display: 'flex', gap: 12 }}>
        <PaperButton onClick={onNew}>📷 录入第一道错题</PaperButton>
        <GhostButton onClick={() => alert('功能开发中：可查看示例错题，了解功能')}>查看示例</GhostButton>
      </div>
    </div>
  );
}

// 图例
function LegendTag({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: color, boxShadow: `0 0 0 2px ${color}22` }} />
      <span>{label}</span>
    </div>
  );
}

// 小撒花
function MiniConfetti() {
  const pieces = Array.from({ length: 14 });
  const colors = ['#2D4A3E', '#D4A373', '#B33939', '#5B7A5A', '#8A7356'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((_, i) => {
        const left = 10 + Math.random() * 80;
        const delay = Math.random() * 80;
        const rotate = Math.random() * 360;
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            style={{
              position: 'absolute',
              top: 16,
              left: `${left}%`,
              width: 6 + Math.random() * 4,
              height: 6 + Math.random() * 4,
              background: color,
              borderRadius: Math.random() < 0.5 ? '50%' : 2,
              animation: `mini-confetti 800ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`
            }}
          >
            <style>{`
              @keyframes mini-confetti {
                0% { transform: translate(0,0) rotate(${rotate}deg); opacity: 0; }
                20% { opacity: 1; }
                100% { transform: translate(${(Math.random() - 0.5) * 80}px, ${30 + Math.random() * 30}px) rotate(${rotate + 360}deg); opacity: 0; }
              }
            `}</style>
          </span>
        );
      })}
    </div>
  );
}

// 相对时间
function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDay = Math.round(diffMs / (24 * 3600 * 1000));
  if (diffMs < 0) {
    if (diffDay >= -1) return '今天';
    if (diffDay >= -2) return '昨天';
    return `超期 ${-diffDay} 天`;
  }
  if (diffDay === 0) return '今天';
  if (diffDay === 1) return '明天';
  if (diffDay < 7) return `${diffDay} 天后`;
  return d.toLocaleDateString();
}
