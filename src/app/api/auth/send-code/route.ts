import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 });
    }

    const { error } = await supabaseServer.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 不再生成和返回验证码，验证码/魔法链接由 Supabase 通过邮件发送
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: '验证码发送异常' }, { status: 500 });
  }
}
