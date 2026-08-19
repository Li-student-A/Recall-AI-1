import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { AI_QUOTA } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const today = new Date().toDateString();
    const { data } = await supabaseServer
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const used = data || { ocr_count: 0, classify_count: 0, generate_count: 0, grade_count: 0 };

    return NextResponse.json({
      daily_limit: {
        ocr: AI_QUOTA.FREE_DAILY_OCR,
        classify: AI_QUOTA.FREE_DAILY_CLASSIFY,
        generate: AI_QUOTA.FREE_DAILY_GENERATE,
        grade: AI_QUOTA.FREE_DAILY_GRADE
      },
      used
    });
  } catch (err) {
    return NextResponse.json({ error: '查询额度失败' }, { status: 500 });
  }
}
