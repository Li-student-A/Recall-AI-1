import { NextResponse } from 'next/server';
import { getUserFromRequest, unauthorizedResponse } from '@/lib/auth';

/**
 * AI 批改（使用智谱 GLM-4-Flash 免费模型）
 * 端点：https://open.bigmodel.cn/api/paas/v4/chat/completions
 */
export async function POST(request: Request) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return unauthorizedResponse();

    const { question, user_answer, standard_answer } = await request.json();

    if (!question || !user_answer) {
      return NextResponse.json({ error: '缺少作答内容' }, { status: 400 });
    }

    const apiKey = process.env.ZHIPU_API_KEY;
    const baseUrl = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const model = process.env.ZHIPU_MODEL || 'glm-4-flash';

    if (!apiKey || apiKey === 'your-zhipu-api-key-here') {
      return NextResponse.json({
        correct: false,
        score: 0,
        feedback: '智谱 API 未配置，请在 .env.local 中设置 ZHIPU_API_KEY（免费申请：bigmodel.cn）',
        error_points: [],
        tips: ''
      });
    }

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
                '你是一位教育批改专家。请比对学生的作答与标准答案，批改并给出详细反馈。必须以纯 JSON 格式返回，不要包含 markdown 代码块标记。'
            },
            {
              role: 'user',
              content: `题目：\n${question}\n\n学生作答：\n${user_answer}\n\n标准答案：\n${standard_answer}\n\n请返回格式：\n{"correct": false, "score": 60, "feedback": "整体评价", "error_points": ["错误点1", "错误点2"], "tips": "解题技巧提示"}`
            }
          ],
          temperature: 0.3
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

    if (!response.ok) {
      let errDetail = '';
      try {
        const errJson = await response.json();
        errDetail = errJson?.error?.message || errJson?.message || JSON.stringify(errJson);
      } catch {
        try { errDetail = await response.text(); } catch { errDetail = ''; }
      }

      let userMsg = 'AI 批改请求失败';
      if (response.status === 401) userMsg = '智谱 API Key 无效，请检查 .env.local';
      else if (response.status === 402) userMsg = '智谱账户额度不足，请登录 bigmodel.cn 查看';
      else if (response.status === 429) userMsg = '智谱调用过于频繁，请稍后再试';
      else if (response.status >= 500) userMsg = '智谱服务暂时不可用，请稍后重试';

      console.error('[AI Grade] 智谱错误:', response.status, errDetail);
      return NextResponse.json(
        { error: `${userMsg}（HTTP ${response.status}）` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content_ = data.choices?.[0]?.message?.content || '';

    let result = {
      correct: false,
      score: 0,
      feedback: '批改失败',
      error_points: [] as string[],
      tips: ''
    };

    let parseSuccess = false;
    try {
      const cleaned = content_.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      result = {
        correct: parsed.correct || false,
        score: parsed.score || 0,
        feedback: parsed.feedback || '',
        error_points: parsed.error_points || [],
        tips: parsed.tips || ''
      };
      parseSuccess = true;
    } catch { /* 继续 */ }

    if (!parseSuccess) {
      const match = content_.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          result = {
            correct: parsed.correct || false,
            score: parsed.score || 0,
            feedback: parsed.feedback || '',
            error_points: parsed.error_points || [],
            tips: parsed.tips || ''
          };
          parseSuccess = true;
        } catch { /* 继续 */ }
      }
    }

    if (!parseSuccess) {
      result.feedback = content_ || 'AI 返回格式异常，请手动批改';
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI 批改异常';
    console.error('[AI Grade] 异常:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
