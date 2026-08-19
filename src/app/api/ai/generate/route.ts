import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';
import { AI_QUOTA } from '@/lib/constants';
import type { AIVariant } from '@/lib/types';

/**
 * AI 变式题生成（使用智谱 GLM-4-Flash 免费模型）
 * 文档：https://docs.bigmodel.cn/cn/api/introduction
 * 端点：https://open.bigmodel.cn/api/paas/v4/chat/completions
 * 免费模型：glm-4-flash（永久免费，无需充值）
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { content, subject, tags } = await request.json();

    if (!content) {
      return NextResponse.json({ error: '缺少错题内容' }, { status: 400 });
    }

    const today = new Date().toDateString();

    // 检查配额
    const { data: quotaData } = await supabaseServer
      .from('ai_usage')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const used = quotaData?.generate_count || 0;
    if (used >= AI_QUOTA.FREE_DAILY_GENERATE) {
      return NextResponse.json({ variants: [], quota_exceeded: true });
    }

    const apiKey = process.env.ZHIPU_API_KEY;
    const baseUrl = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const model = process.env.ZHIPU_MODEL || 'glm-4-flash';

    if (!apiKey || apiKey === 'your-zhipu-api-key-here') {
      return NextResponse.json(
        { variants: [], message: '智谱 API 未配置，请在 .env.local 中设置 ZHIPU_API_KEY（免费申请：bigmodel.cn）' },
        { status: 200 }
      );
    }

    // 调用智谱 GLM，加 30 秒超时
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
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
                '你是一位教育出题专家。基于给定的错题，生成 3 道同考点、同难度、不同题型的变式练习题。每道题包含：题干、标准答案、解题步骤。必须以纯 JSON 数组格式返回，不要包含任何 markdown 代码块标记。'
            },
            {
              role: 'user',
              content: `原题：\n${content}\n\n学科：${subject}\n知识点：${tags?.join(', ') || ''}\n\n请生成 3 道变式题，以纯 JSON 数组格式返回：\n[{"id": 1, "question": "题干", "standard_answer": "标准答案", "solution_steps": ["步骤1", "步骤2"]}]`
            }
          ],
          temperature: 0.8
        }),
        signal: controller.signal
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const msg = fetchErr?.name === 'AbortError'
        ? '智谱 GLM 响应超时（30秒），请稍后重试'
        : '无法连接智谱服务，请检查网络';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    clearTimeout(timeout);

    // 把智谱的真实错误信息透传给前端
    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson?.error?.message || errJson?.message || JSON.stringify(errJson);
      } catch {
        try { errDetail = await response.text(); } catch { errDetail = ''; }
      }

      let userMsg = '变式题生成失败';
      if (response.status === 401) userMsg = '智谱 API Key 无效，请检查 .env.local 中的 ZHIPU_API_KEY';
      else if (response.status === 402) userMsg = '智谱账户额度不足，请登录 bigmodel.cn 查看';
      else if (response.status === 429) userMsg = '智谱调用过于频繁，请稍后再试';
      else if (response.status >= 500) userMsg = '智谱服务暂时不可用，请稍后重试';

      console.error('[AI Generate] 智谱错误:', response.status, errDetail);
      return NextResponse.json(
        { error: `${userMsg}（HTTP ${response.status}）` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content_ = data.choices?.[0]?.message?.content || '';

    // 增强容错：从 markdown 代码块或纯文本中提取 JSON 数组
    let variants: AIVariant[] = [];
    let parseSuccess = false;

    // 尝试 1：去掉 markdown 代码块标记后直接解析
    try {
      const cleaned = content_.replace(/```json/gi, '').replace(/```/g, '').trim();
      variants = JSON.parse(cleaned);
      parseSuccess = Array.isArray(variants);
    } catch { /* 继续尝试 */ }

    // 尝试 2：用正则提取第一个 JSON 数组
    if (!parseSuccess) {
      const match = content_.match(/\[[\s\S]*\]/);
      if (match) {
        try {
          variants = JSON.parse(match[0]);
          parseSuccess = Array.isArray(variants);
        } catch { /* 继续 */ }
      }
    }

    // 尝试 3：用正则逐个提取 JSON 对象
    if (!parseSuccess) {
      const objMatches = content_.match(/\{[^{}]*\}/g);
      if (objMatches && objMatches.length > 0) {
        variants = objMatches.map((obj: string, i: number) => {
          try {
            return JSON.parse(obj);
          } catch {
            return null;
          }
        }).filter(Boolean) as AIVariant[];
        if (variants.length > 0) parseSuccess = true;
      }
    }

    // 全部失败 → 返回 AI 原始文本作为题干（不报错，让用户至少能用）
    if (!parseSuccess || variants.length === 0) {
      variants = [
        {
          id: 1,
          question: content_.trim() || content,
          standard_answer: 'AI 返回格式异常，请手动填写答案',
          solution_steps: ['AI 原始返回：', content_.substring(0, 200)]
        }
      ];
    }

    // 扣减配额（只有在成功调用后才扣）
    const { error: quotaError } = await supabaseServer
      .from('ai_usage')
      .upsert({
        user_id: user.id,
        date: today,
        generate_count: used + 1,
        ...(quotaData ? {
          ocr_count: quotaData.ocr_count,
          classify_count: quotaData.classify_count,
          grade_count: quotaData.grade_count
        } : {})
      });

    if (quotaError) console.error('[AI Generate] 配额扣减失败:', quotaError);

    return NextResponse.json({ variants });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '变式题生成异常';
    console.error('[AI Generate] 异常:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
