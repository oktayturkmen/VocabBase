import { MS_PER_DAY } from '@/services/review/spaced-repetition.algorithm';

export function formatReviewDueLabel(nextReviewAt: number, now: number = Date.now()): string {
  if (nextReviewAt > now) {
    return 'Upcoming';
  }

  const overdueMs = now - nextReviewAt;

  if (overdueMs < MS_PER_DAY) {
    return 'Due today';
  }

  const overdueDays = Math.floor(overdueMs / MS_PER_DAY);

  if (overdueDays === 1) {
    return '1 day overdue';
  }

  return `${overdueDays} days overdue`;
}
