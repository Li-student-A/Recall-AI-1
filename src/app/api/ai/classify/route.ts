import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { content } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '缺少题干内容' }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    if (!apiKey) {
      return NextResponse.json(
        { tags: ['待 AI 分类'], message: 'DeepSeek 未配置' },
        { status: 200 }
      );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是一位教育分类专家。请为以下错题内容生成三级标签：学科、细分知识点、错误类型。以 JSON 格式返回。'
          },
          {
            role: 'user',
            content: `错题内容：\n${content}\n\n请返回格式：{"subject": "学科", "knowledge_point": "细分知识点", "error_type": "错误类型"}`
          }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) throw new Error('AI 分类请求失败');
    const data = await response.json();
    const content_ = data.choices?.[0]?.message?.content || '';

    let tags: string[] = [];
    try {
      const parsed = JSON.parse(content_.replace(/```json/g, '').replace(/```/g, ''));
      tags = [parsed.subject, parsed.knowledge_point, parsed.error_type].filter(Boolean);
    } catch {
      tags = ['AI 分类结果'];
    }

    return NextResponse.json({ tags });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI 分类异常';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
