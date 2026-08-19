import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { image } = await request.json();

    if (!image) {
      return NextResponse.json({ error: '缺少图片数据' }, { status: 400 });
    }

    const apiKey = process.env.BAIDU_OCR_API_KEY;
    const secret = process.env.BAIDU_OCR_SECRET;

    if (!apiKey || !secret) {
      return NextResponse.json(
        {
          text: '[OCR 服务未配置，请在 .env.local 中设置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET]',
          tags: ['待手动输入']
        },
        { status: 200 }
      );
    }

    const tokenResponse = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secret}`
    );

    if (!tokenResponse.ok) {
      throw new Error('获取百度 OCR Token 失败');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const ocrResponse = await fetch(
      `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `image=${encodeURIComponent(image)}`
      }
    );

    if (!ocrResponse.ok) {
      throw new Error('OCR 识别失败');
    }

    const ocrData = await ocrResponse.json();
    const text = ocrData.words_result
      ? ocrData.words_result.map((w: { words: string }) => w.words).join('\n')
      : '';

    return NextResponse.json({ text, tags: [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OCR 识别异常';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
