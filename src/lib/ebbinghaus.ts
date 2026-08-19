import { MASTERY_LEVELS } from '@/lib/constants';

export interface ReviewPlan {
  mistakeId: string;
  nextReviewAt: string;
  stage: number;
  masteryLevel: keyof typeof MASTERY_LEVELS;
}

/**
 * 计算复习计划。
 * 首次录入（existingStage=0）时，第一次复习定在今天（0 天后），
 * 这样用户录入完错题后，立即能在"今日复习清单"看到它。
 * 后续 stage 走艾宾浩斯遗忘曲线。
 */
export function calculateReviewPlan(
  mistakeId: string,
  masteryLevel: keyof typeof MASTERY_LEVELS,
  existingStage = 0
): ReviewPlan {
  const cycles = MASTERY_LEVELS[masteryLevel].cycles;
  const stage = Math.min(existingStage, cycles.length - 1);
  // stage 0 → 今天就复习（0 天后）；stage >=1 → 按 cycles 走
  const days = stage === 0 ? 0 : cycles[stage];
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + days);

  return {
    mistakeId,
    nextReviewAt: nextReviewAt.toISOString(),
    stage,
    masteryLevel
  };
}

export function advanceStage(
  plan: ReviewPlan,
  masteryLevel: keyof typeof MASTERY_LEVELS
): ReviewPlan {
  const cycles = MASTERY_LEVELS[masteryLevel].cycles;
  const nextStage = Math.min(plan.stage + 1, cycles.length - 1);
  const days = cycles[nextStage];
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + days);

  return {
    ...plan,
    stage: nextStage,
    masteryLevel,
    nextReviewAt: nextReviewAt.toISOString()
  };
}

export function isOverdue(nextReviewAt: string): boolean {
  return new Date(nextReviewAt) < new Date();
}

export function getCycles(masteryLevel: keyof typeof MASTERY_LEVELS): number[] {
  return [...MASTERY_LEVELS[masteryLevel].cycles];
}
