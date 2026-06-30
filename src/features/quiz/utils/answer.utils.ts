export type QuizType = 'multiple-choice' | 'typing';

export function normaliseAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function isAnswerCorrect(
  userAnswer: string,
  correctAnswer: string,
  quizType: QuizType,
): boolean {
  if (quizType === 'typing') {
    return normaliseAnswer(userAnswer) === normaliseAnswer(correctAnswer);
  }

  return userAnswer === correctAnswer;
}
