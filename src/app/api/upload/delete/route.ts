import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: '缺少错题 ID' }, { status: 400 });
    }

    // 确保只能删除自己错题关联的图片
    const { data: mistake, error: fetchError } = await supabaseServer
      .from('mistakes')
      .select('image_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!mistake?.image_url) {
      return NextResponse.json({ success: true, message: '无关联图片' });
    }

    const { data: files, error } = await supabaseServer.storage
      .from('mistake-images')
      .list(mistake.image_url.split('/').slice(0, -1).join('/'));

    if (error) throw error;

    const deletedFiles = files.filter((f) => f.name === mistake.image_url.split('/').pop());
    if (deletedFiles.length > 0) {
      await supabaseServer.storage
        .from('mistake-images')
        .remove(deletedFiles.map((f) => f.name));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '删除图片失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
