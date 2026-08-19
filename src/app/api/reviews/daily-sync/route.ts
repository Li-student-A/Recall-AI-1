import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { verifyCronAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // 验证 Cron 鉴权
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 查询所有过期的未完成复习计划
    const { data: overduePlans, error } = await supabaseServer
      .from('review_plans')
      .select('id, mastery_level, stage, next_review_at')
      .lte('next_review_at', today.toISOString())
      .eq('completed', false);

    if (error) throw error;

    let rescheduledCount = 0;

    // 重新调度过期计划：将 next_review_at 设为今天
    for (const plan of overduePlans || []) {
      const { error: updateError } = await supabaseServer
        .from('review_plans')
        .update({
          next_review_at: today.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', plan.id);

      if (!updateError) {
        rescheduledCount++;
      }
    }

    return NextResponse.json({
      synced_at: new Date().toISOString(),
      overdue_count: overduePlans?.length || 0,
      rescheduled_count: rescheduledCount,
      message: '每日复习计划同步完成'
    });
  } catch (err) {
    return NextResponse.json({ error: '每日同步失败' }, { status: 500 });
  }
}
