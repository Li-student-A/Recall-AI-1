import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少 6 位' }, { status: 400 });
    }

    const { data, error } = await supabaseServer.auth.signUp({
      email,
      password,
      options: {
        data: { role: 'user' }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data.user });
  } catch (err) {
    return NextResponse.json({ error: '注册服务异常' }, { status: 500 });
  }
}
