export async function getTodayReviews() {
  const response = await fetch('/api/reviews/today');
  if (!response.ok) throw new Error('获取今日复习计划失败');
  return response.json();
}

export async function getCalendarData(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year) params.set('year', String(year));
  if (month) params.set('month', String(month));
  const response = await fetch(`/api/reviews/calendar?${params}`);
  if (!response.ok) throw new Error('获取日历数据失败');
  return response.json();
}

export async function updateReviewPlan(id: string, updates: { completed?: boolean; mastery_level?: string }) {
  const response = await fetch('/api/reviews/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  });
  if (!response.ok) throw new Error('更新复习计划失败');
  return response.json();
}

export async function getReviewStats() {
  const response = await fetch('/api/reviews/stats');
  if (!response.ok) throw new Error('获取统计数据失败');
  return response.json();
}
