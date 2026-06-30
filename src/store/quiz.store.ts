import { create } from 'zustand';

import { isAnswerCorrect, type QuizType } from '@/features/quiz/utils/answer.utils';
import { getQuizService } from '@/services/quiz/quiz.service';

export type { QuizType };

export type QuizQuestion = {
  wordId: number;
  word: string;
  correctAnswer: string;
  options: string[];
};

export type QuizAnswerRecord = {
  wordId: number;
  word: string;
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
};

type QuizStoreState = {
  quizType: QuizType | null;
  questions: QuizQuestion[];
  currentIndex: number;
  selectedAnswer: string | null;
  answers: QuizAnswerRecord[];
  score: number;
  status: 'idle' | 'loading' | 'active' | 'completed';
  error: string | null;
  isLoading: boolean;
};

type QuizStoreActions = {
  startMultipleChoiceQuiz: (limit?: number) => Promise<void>;
  startTypingQuiz: (limit?: number) => Promise<void>;
  submitAnswer: (answer: string) => void;
  nextQuestion: () => void;
  resetQuiz: () => void;
};

export type QuizStore = QuizStoreState & QuizStoreActions;

const initialState: QuizStoreState = {
  quizType: null,
  questions: [],
  currentIndex: 0,
  selectedAnswer: null,
  answers: [],
  score: 0,
  status: 'idle',
  error: null,
  isLoading: false,
};

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  ...initialState,

  startMultipleChoiceQuiz: async (limit = 10) => {
    set({ isLoading: true, error: null, status: 'loading', quizType: 'multiple-choice' });
    try {
      const service = await getQuizService();
      const quizWords = await service.getQuizWords(limit);

      if (quizWords.length === 0) {
        set({
          questions: [],
          currentIndex: 0,
          selectedAnswer: null,
          answers: [],
          score: 0,
          status: 'idle',
          isLoading: false,
          error: 'No words available to generate a quiz. Please add some words first.',
        });
        return;
      }

      // Generate options for each word
      const questions: QuizQuestion[] = [];
      for (const word of quizWords) {
        const distractors = await service.getDistractors(word.id, 3);
        const options = shuffleArray([word.meaning, ...distractors]);
        questions.push({
          wordId: word.id,
          word: word.word,
          correctAnswer: word.meaning,
          options,
        });
      }

      set({
        questions,
        currentIndex: 0,
        selectedAnswer: null,
        answers: [],
        score: 0,
        status: 'active',
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to start quiz session',
      });
    }
  },

  startTypingQuiz: async (limit = 10) => {
    set({ isLoading: true, error: null, status: 'loading', quizType: 'typing' });
    try {
      const service = await getQuizService();
      const quizWords = await service.getQuizWords(limit);

      if (quizWords.length === 0) {
        set({
          questions: [],
          currentIndex: 0,
          selectedAnswer: null,
          answers: [],
          score: 0,
          status: 'idle',
          isLoading: false,
          error: 'No words available to generate a quiz. Please add some words first.',
        });
        return;
      }

      const questions: QuizQuestion[] = quizWords.map((word) => ({
        wordId: word.id,
        word: word.word,
        correctAnswer: word.meaning,
        options: [],
      }));

      set({
        questions,
        currentIndex: 0,
        selectedAnswer: null,
        answers: [],
        score: 0,
        status: 'active',
        isLoading: false,
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Failed to start quiz session',
      });
    }
  },

  submitAnswer: (answer: string) => {
    const { questions, currentIndex, selectedAnswer, answers, score, quizType } = get();
    if (currentIndex >= questions.length || selectedAnswer !== null || !quizType) {
      return;
    }

    const currentQuestion = questions[currentIndex];
    const isCorrect = isAnswerCorrect(answer, currentQuestion.correctAnswer, quizType);

    const record: QuizAnswerRecord = {
      wordId: currentQuestion.wordId,
      word: currentQuestion.word,
      correctAnswer: currentQuestion.correctAnswer,
      userAnswer: answer,
      isCorrect,
    };

    set({
      selectedAnswer: answer,
      answers: [...answers, record],
      score: isCorrect ? score + 1 : score,
    });
  },

  nextQuestion: () => {
    const { questions, currentIndex } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      set({
        currentIndex: nextIndex,
        status: 'completed',
        selectedAnswer: null,
      });
    } else {
      set({
        currentIndex: nextIndex,
        selectedAnswer: null,
      });
    }
  },

  resetQuiz: () => {
    set(initialState);
  },
}));
