import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST() {
  try {
    const { error } = await supabaseServer.auth.signOut();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '退出服务异常' }, { status: 500 });
  }
}
