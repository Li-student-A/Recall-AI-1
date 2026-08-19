import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({
      user: data.user,
      session: data.session
    });
  } catch (err) {
    return NextResponse.json({ error: '登录服务异常' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: '登录接口' });
}
