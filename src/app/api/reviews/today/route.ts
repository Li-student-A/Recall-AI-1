import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabaseServer
      .from('review_plans')
      .select('*, mistakes(content, subject, tags)')
      .eq('user_id', user.id)
      .lte('next_review_at', today.toISOString())
      .order('next_review_at', { ascending: true });

    if (error) throw error;

    const completed = (data || []).filter((r) => r.completed).length;
    const pending = (data || []).filter((r) => !r.completed).length;

    return NextResponse.json({ tasks: data, completed, pending });
  } catch (err) {
    return NextResponse.json({ error: '获取今日复习计划失败' }, { status: 500 });
  }
}
