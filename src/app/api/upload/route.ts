import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: '文件大小不能超过 10MB' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG、PNG、WebP 格式' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const fileBuffer = await file.arrayBuffer();
    const { data, error } = await supabaseServer.storage
      .from('mistake-images')
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    const { data: publicUrl } = supabaseServer.storage
      .from('mistake-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl.publicUrl,
      path: data.path,
      size: file.size
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '文件上传失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
