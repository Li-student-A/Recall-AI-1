'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { App } from 'antd';
import { supabaseClient } from '@/lib/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import PageContainer from '@/components/layout/PageContainer';
import PaperCard from '@/components/common/PaperCard';
import GhostButton from '@/components/common/GhostButton';

interface CalendarDay {
  date: Date;
  day: number;
  hasTasks: boolean;
  completed: boolean;
  overdue: boolean;
  taskCount: number;
}

interface DayTasks {
  date: string;
  tasks: Array<{
    id: string;
    content: string;
    subject: string;
    completed: boolean;
  }>;
}

export default function CalendarPage() {
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayTasks, setDayTasks] = useState<DayTasks | null>(null);
  const [monthStats, setMonthStats] = useState({ completed: 0, total: 0 });

  // 防重复请求 / 防重复错误弹窗（React StrictMode 下 useEffect 会触发两次）
  const isLoadingRef = useRef(false);
  const lastErrorKeyRef = useRef<string>('');

  useEffect(() => {
    generateCalendar();
    loadMonthData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: CalendarDay[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push({
        date: new Date(year, month, i - startDay + 1),
        day: 0,
        hasTasks: false,
        completed: false,
        overdue: false,
        taskCount: 0
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        day: i,
        hasTasks: false,
        completed: false,
        overdue: false,
        taskCount: 0
      });
    }

    setCalendarDays(days);
  };

  const loadMonthData = async () => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstOfMonth = new Date(year, month, 1).toISOString();
      const lastOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      const { data, error } = await supabaseClient
        .from('review_plans')
        .select('*, mistakes(content, subject)')
        .eq('user_id', user.id)
        .gte('next_review_at', firstOfMonth)
        .lte('next_review_at', lastOfMonth);

      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedDays = new Set<string>();
      let totalTasks = 0;
      let completedTasks = 0;

      const updatedDays = calendarDays.map((d) => {
        if (d.day === 0) return d;
        const dayTasks = (data || []).filter((item: any) => {
          const itemDate = new Date(item.next_review_at);
          return (
            itemDate.getFullYear() === year &&
            itemDate.getMonth() === month &&
            itemDate.getDate() === d.day
          );
        });

        if (dayTasks.length > 0) {
          totalTasks += dayTasks.length;
          const allCompleted = dayTasks.every((t: any) => t.completed);
          if (allCompleted) {
            completedDays.add(d.date.toDateString());
            completedTasks += dayTasks.length;
          }
          const isOverdue =
            !allCompleted &&
            d.date < today &&
            dayTasks.some((t: any) => !t.completed);

          return {
            ...d,
            hasTasks: true,
            completed: allCompleted,
            overdue: isOverdue,
            taskCount: dayTasks.length
          };
        }
        return d;
      });

      setCalendarDays(updatedDays);
      setMonthStats({ completed: completedTasks, total: totalTasks });
    } catch (err: any) {
      console.error('[Calendar] 月数据加载失败:', err);
      const msg = err.message || '';
      const errKey = `month::${msg}::${currentMonth.toISOString()}`;
      if (lastErrorKeyRef.current !== errKey) {
        lastErrorKeyRef.current = errKey;
        if (msg.includes('permission denied') || msg.includes('42501')) {
          messageApi.warning('数据库权限未配置，请在 Supabase 后台执行 fix-rls.sql', 8);
        } else if (msg.includes('relation') && msg.includes('does not exist')) {
          messageApi.warning('数据库表尚未创建，请执行 schema.sql', 8);
        } else if (msg.includes('Invalid path') || msg.includes('request URL')) {
          messageApi.error('服务器连接失败，请稍后重试');
        } else {
          messageApi.error('加载日历数据失败');
        }
      }
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handleDateClick = (day: CalendarDay) => {
    if (day.day === 0) return;
    setSelectedDate(day.date);
    loadDayTasks(day.date);
  };

  const loadDayTasks = async (date: Date) => {
    try {
      const {
        data: { user }
      } = await supabaseClient.auth.getUser();
      if (!user) return;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await supabaseClient
        .from('review_plans')
        .select('*, mistakes(content, subject)')
        .eq('user_id', user.id)
        .gte('next_review_at', startOfDay.toISOString())
        .lte('next_review_at', endOfDay.toISOString())
        .order('next_review_at', { ascending: true });

      if (error) throw error;

      setDayTasks({
        date: date.toDateString(),
        tasks:
          data?.map((item: any) => ({
            id: item.id,
            content: item.mistakes?.content || '未命名错题',
            subject: item.mistakes?.subject || '其他',
            completed: item.completed || false
          })) || []
      });
    } catch (err: any) {
      console.error('[Calendar] 日任务加载失败:', err);
      const msg = err.message || '';
      const errKey = `day::${msg}::${date.toDateString()}`;
      if (lastErrorKeyRef.current !== errKey) {
        lastErrorKeyRef.current = errKey;
        if (msg.includes('permission denied') || msg.includes('42501')) {
          messageApi.warning('数据库权限未配置，请在 Supabase 后台执行 fix-rls.sql', 8);
        } else if (msg.includes('relation') && msg.includes('does not exist')) {
          messageApi.warning('数据库表尚未创建，请执行 schema.sql', 8);
        } else if (msg.includes('Invalid path') || msg.includes('request URL')) {
          messageApi.error('服务器连接失败，请稍后重试');
        } else {
          messageApi.error('加载当日任务失败');
        }
      }
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    setSelectedDate(null);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    loadDayTasks(today);
  };

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  return (
    <AppLayout>
      <PageContainer title="复习日历">
        {/* 月份控制栏 */}
        <PaperCard style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <GhostButton onClick={handlePrevMonth}>← 上一月</GhostButton>
            <span style={{ fontSize: '18pt', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
              {currentMonth.getFullYear()} 年 {currentMonth.getMonth() + 1} 月
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <GhostButton onClick={handleToday}>返回今日</GhostButton>
              <GhostButton onClick={handleNextMonth}>下一月 →</GhostButton>
            </div>
          </div>
        </PaperCard>

        {/* 日历网格 */}
        <PaperCard style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
            {weekDays.map((w) => (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  padding: '8px 0',
                  fontSize: '12pt',
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-line)'
                }}
              >
                {w}
              </div>
            ))}
            {calendarDays.map((day, i) => (
              <div
                key={i}
                onClick={() => handleDateClick(day)}
                style={{
                  padding: '12px 8px',
                  minHeight: 72,
                  cursor: day.day > 0 ? 'pointer' : 'default',
                  backgroundColor:
                    day.day === 0
                      ? 'transparent'
                      : selectedDate?.toDateString() === day.date.toDateString()
                      ? 'rgba(45, 74, 62, 0.08)'
                      : day.hasTasks
                      ? 'var(--card-bg)'
                      : '#F5F0E8',
                  border: '1px solid var(--border-line)',
                  borderRadius: 4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  transition: 'background-color 0.2s'
                }}
              >
                <span style={{ fontSize: '14pt', fontWeight: 500 }}>
                  {day.day || ''}
                </span>
                {day.hasTasks && (
                  <span
                    style={{
                      fontSize: '10pt',
                      marginTop: 'auto',
                      color: day.completed
                        ? 'var(--success-green)'
                        : day.overdue
                        ? 'var(--danger-red)'
                        : 'var(--text-secondary)'
                    }}
                  >
                    {day.completed ? '☑' : day.overdue ? '●' : `${day.taskCount}题`}
                  </span>
                )}
              </div>
            ))}
          </div>
        </PaperCard>

        {/* 当日复习清单 */}
        {selectedDate && (
          <PaperCard>
            <div className="section-title">
              {selectedDate.toLocaleDateString()} 复习清单
            </div>
            {dayTasks && dayTasks.tasks.length > 0 ? (
              <div>
                {dayTasks.tasks.map((task) => (
                  <div key={task.id} className="review-card">
                    <div className="review-preview">
                      {task.content.length > 40
                        ? task.content.slice(0, 40) + '...'
                        : task.content}
                    </div>
                    <div className="review-meta">
                      <span style={{ marginRight: 8 }}>{task.subject}</span>
                      <a
                        className="link-paper"
                        onClick={() => router.push(`/practice?mistake=${task.id}`)}
                      >
                        开始复习
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>
                当日暂无复习任务
              </div>
            )}
          </PaperCard>
        )}

        {/* 月度统计 */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            padding: 16,
            borderTop: '1px solid var(--border-line)',
            fontSize: '12pt',
            color: 'var(--text-secondary)'
          }}
        >
          本月累计完成复习：{monthStats.completed} 道题目
        </div>
      </PageContainer>
    </AppLayout>
  );
}
