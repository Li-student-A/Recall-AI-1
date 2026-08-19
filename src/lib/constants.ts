export const APP_CONFIG = {
  name: 'Recall AI',
  tagline: '错题重温・日拱一卒',
  copyright: '本产品面向 18 岁以上用户'
};

export const SUBJECTS = [
  '高等数学',
  '线性代数',
  '概率论与数理统计',
  '英语',
  '政治',
  '专业课',
  '其他'
] as const;

export const MASTERY_LEVELS = {
  TOTAL: { label: '完全不会', cycles: [1, 3, 7, 15], color: '#B33939' },
  PARTIAL: { label: '半知半解', cycles: [3, 7, 15], color: '#D4A373' },
  CARELESS: { label: '粗心失误', cycles: [7, 15], color: '#5B7A5A' }
} as const;

export const AI_QUOTA = {
  FREE_DAILY_OCR: 10,
  FREE_DAILY_CLASSIFY: 20,
  FREE_DAILY_GENERATE: 10,
  FREE_DAILY_GRADE: 20
} as const;

export const PAGE_SIZE = 25;

export const SESSION_DURATION_DAYS = 7;
