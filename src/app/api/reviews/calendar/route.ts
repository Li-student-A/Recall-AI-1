import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    const firstOfMonth = new Date(year, month - 1, 1).toISOString();
    const lastOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

    const { data, error } = await supabaseServer
      .from('review_plans')
      .select('*, mistakes(subject)')
      .eq('user_id', user.id)
      .gte('next_review_at', firstOfMonth)
      .lte('next_review_at', lastOfMonth);

    if (error) throw error;

    const calendarMap: Record<string, { total: number; completed: number }> = {};
    (data || []).forEach((plan) => {
      const d = new Date(plan.next_review_at);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!calendarMap[key]) {
        calendarMap[key] = { total: 0, completed: 0 };
      }
      calendarMap[key].total += 1;
      if (plan.completed) calendarMap[key].completed += 1;
    });

    return NextResponse.json({ calendar: calendarMap, year, month });
  } catch (err) {
    return NextResponse.json({ error: '获取日历数据失败' }, { status: 500 });
  }
}
