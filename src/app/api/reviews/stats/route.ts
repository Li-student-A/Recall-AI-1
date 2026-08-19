import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseServer
      .from('review_plans')
      .select('*, mistakes(subject)')
      .eq('user_id', user.id)
      .gte('next_review_at', startOfWeek.toISOString())
      .lte('next_review_at', today.toISOString());

    if (error) throw error;

    const total = (data || []).length;
    const completed = (data || []).filter((r) => r.completed).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const subjectStats: Record<string, number> = {};
    (data || []).forEach((plan) => {
      const subject = plan.mistakes?.subject || '其他';
      if (!subjectStats[subject]) subjectStats[subject] = 0;
      if (plan.completed) subjectStats[subject] += 1;
    });

    return NextResponse.json({
      total,
      completed,
      completionRate,
      subjectStats,
      streakDays: 0
    });
  } catch (err) {
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
