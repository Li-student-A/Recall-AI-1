import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { MASTERY_LEVELS } from '@/lib/constants';

export async function PUT(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id, completed, mastery_level } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少复习计划 ID' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (completed !== undefined) updates.completed = completed;
    if (mastery_level) {
      // 从 constants 获取周期，不再硬编码
      const levelConfig = MASTERY_LEVELS[mastery_level as keyof typeof MASTERY_LEVELS];
      const cycles = levelConfig?.cycles || MASTERY_LEVELS.PARTIAL.cycles;
      const nextReviewAt = new Date();
      nextReviewAt.setDate(nextReviewAt.getDate() + cycles[0]);
      updates.mastery_level = mastery_level;
      updates.next_review_at = nextReviewAt.toISOString();
      updates.stage = 0;
    }

    const { data, error } = await supabaseServer
      .from('review_plans')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id) // 确保只能更新自己的复习计划
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: '更新复习计划失败' }, { status: 500 });
  }
}
