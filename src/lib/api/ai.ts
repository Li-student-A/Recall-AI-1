export async function ocrRecognize(imageBase64: string, filename?: string) {
  const response = await fetch('/api/ai/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, filename })
  });
  if (!response.ok) throw new Error('OCR 识别失败');
  return response.json();
}

export async function classifyByAI(content: string) {
  const response = await fetch('/api/ai/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  if (!response.ok) throw new Error('AI 分类失败');
  return response.json();
}

export async function generateVariants(mistake: {
  id: string;
  content: string;
  subject?: string;
  tags?: string[];
}) {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mistake)
  });
  if (!response.ok) throw new Error('变式题生成失败');
  return response.json();
}

export async function gradeAnswer(question: string, userAnswer: string, standardAnswer: string) {
  const response = await fetch('/api/ai/grade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, user_answer: userAnswer, standard_answer: standardAnswer })
  });
  if (!response.ok) throw new Error('AI 批改失败');
  return response.json();
}

export async function getAIQuota() {
  const response = await fetch('/api/ai/quota');
  if (!response.ok) throw new Error('获取额度失败');
  return response.json();
}
