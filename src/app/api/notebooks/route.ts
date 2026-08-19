import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { data, error } = await supabaseServer
      .from('notebooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: '获取错题本列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { name, subject } = await request.json();

    const { data, error } = await supabaseServer
      .from('notebooks')
      .insert({
        user_id: user.id,
        name,
        subject
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: '创建错题本失败' }, { status: 500 });
  }
}
