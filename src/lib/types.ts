/**
 * 数据库实体类型定义
 * 与 supabase/schema.sql 中的表结构一一对应
 */

export type MasteryLevel = 'TOTAL' | 'PARTIAL' | 'CARELESS';

export interface UserSettings {
  id: string;
  user_id: string;
  nickname: string;
  custom_cycles: number[];
  daily_max_review: number;
  created_at: string;
  updated_at: string;
}

export interface Notebook {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  created_at: string;
  updated_at: string;
}

export interface Mistake {
  id: string;
  user_id: string;
  notebook_id: string | null;
  content: string;
  correct_answer: string;
  wrong_answer: string;
  wrong_reason: string;
  subject: string;
  tags: string[];
  mastery_level: MasteryLevel;
  image_url: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface PracticeQuestion {
  id: string;
  mistake_id: string;
  question: string;
  standard_answer: string;
  solution_steps: string[];
  created_at: string;
}

export interface ReviewPlan {
  id: string;
  user_id: string;
  mistake_id: string;
  next_review_at: string;
  stage: number;
  mastery_level: MasteryLevel;
  completed: boolean;
  created_at: string;
  updated_at: string;
  // 关联查询时的嵌套数据
  mistakes?: Pick<Mistake, 'content' | 'subject' | 'tags'> | null;
}

export interface ReviewRecord {
  id: string;
  plan_id: string;
  user_answer: string;
  score: number;
  feedback: string;
  created_at: string;
}

export interface AIUsage {
  id: string;
  user_id: string;
  date: string;
  ocr_count: number;
  classify_count: number;
  generate_count: number;
  grade_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * API 响应类型
 */
export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  totalPages: number;
}

export interface AIGradeResult {
  correct: boolean;
  score: number;
  feedback: string;
  error_points: string[];
  tips: string;
}

export interface AIVariant {
  id: number;
  question: string;
  standard_answer: string;
  solution_steps: string[];
}
