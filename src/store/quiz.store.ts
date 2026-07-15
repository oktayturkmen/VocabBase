import { create } from 'zustand';

import { isAnswerCorrect, type QuizType } from '@/features/quiz/utils/answer.utils';
import { getQuizService } from '@/services/quiz/quiz.service';
import { useStatisticStore } from '@/store/statistic.store';
import { useGamificationStore } from '@/store/gamification.store';
import { getLocalDateString } from '@/utils/date';
import { shuffleArray } from '@/utils/shuffle';

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
  sessionStartTime: number | null;
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
  sessionStartTime: null,
};

export const useQuizStore = create<QuizStore>((set, get) => ({
  ...initialState,

  startMultipleChoiceQuiz: async (limit = 10) => {
    set({ isLoading: true, error: null, status: 'loading', quizType: 'multiple-choice' });
    try {
      const service = await getQuizService();
      const wordCount = await service.getWordCount();

      if (wordCount < 4) {
        set({
          questions: [],
          currentIndex: 0,
          selectedAnswer: null,
          answers: [],
          score: 0,
          status: 'idle',
          isLoading: false,
          error: 'Çoktan seçmeli quiz için en az 4 kelime gerekiyor. Lütfen önce daha fazla kelime ekleyin.',
          sessionStartTime: null,
        });
        return;
      }

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
          error: 'Quiz oluşturmak için yeterli kelime yok. Lütfen önce kelime ekleyin.',
          sessionStartTime: null,
        });
        return;
      }

      // Generate options for each word
      const questions: QuizQuestion[] = [];
      for (const word of quizWords) {
        const distractors = await service.getDistractors(word.id, word.meaning, 3);
        if (distractors.length < 3) {
          set({
            questions: [],
            currentIndex: 0,
            selectedAnswer: null,
            answers: [],
            score: 0,
            status: 'idle',
            isLoading: false,
            error: 'Çoktan seçmeli quiz için farklı anlamlara sahip en az 4 kelime gerekiyor.',
            sessionStartTime: null,
          });
          return;
        }

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
        sessionStartTime: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Quiz oturumu başlatılamadı',
        sessionStartTime: null,
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
          error: 'Quiz oluşturmak için yeterli kelime yok. Lütfen önce kelime ekleyin.',
          sessionStartTime: null,
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
        sessionStartTime: Date.now(),
      });
    } catch (error) {
      set({
        isLoading: false,
        status: 'idle',
        error: error instanceof Error ? error.message : 'Quiz oturumu başlatılamadı',
        sessionStartTime: null,
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

    // İstatistik kaydı
    const today = getLocalDateString();
    if (isCorrect) {
      void useStatisticStore.getState().incrementQuizCorrect(today);
    } else {
      void useStatisticStore.getState().incrementQuizIncorrect(today);
    }
  },

  nextQuestion: () => {
    const { questions, currentIndex, sessionStartTime, answers } = get();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= questions.length) {
      // Quiz completed - record time spent
      if (sessionStartTime) {
        const timeSpentSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
        const today = getLocalDateString();
        void useStatisticStore.getState().addTimeSpent(today, timeSpentSeconds);
      }

      // Gamification: Add XP for completing quiz (+30 XP)
      void useGamificationStore.getState().addXp(30);

      // Check if quiz was 100% correct for bonus XP (+20 XP)
      const allCorrect = answers.length > 0 && answers.every((answer) => answer.isCorrect);
      if (allCorrect) {
        void useGamificationStore.getState().addXp(20);
        // Check and unlock quiz_master badge
        void useGamificationStore.getState().checkAndUnlockBadge('quiz_master', true);
      }

      set({
        currentIndex: nextIndex,
        status: 'completed',
        selectedAnswer: null,
        sessionStartTime: null,
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
