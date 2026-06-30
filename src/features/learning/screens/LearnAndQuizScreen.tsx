import React from 'react';

import { Loading } from '@/components';
import {
  ActiveReviewSession,
  CompletedReviewSession,
} from '@/features/review/screens/TodayReviewScreen';
import { useLearningStore } from '@/store/learning.store';
import { useReviewStore } from '@/store/review.store';

import { LearnAndQuizHub } from './LearnAndQuizHub';
import LearnScreen from './LearnScreen';

export default function LearnAndQuizScreen() {
  const reviewStatus = useReviewStore((state) => state.status);
  const learningStatus = useLearningStore((state) => state.status);

  if (reviewStatus === 'loading') {
    return <Loading message="Tekrar oturumu hazırlanıyor..." fullScreen />;
  }

  if (reviewStatus === 'active') {
    return <ActiveReviewSession />;
  }

  if (reviewStatus === 'completed') {
    return <CompletedReviewSession />;
  }

  if (learningStatus === 'loading' || learningStatus === 'active' || learningStatus === 'completed') {
    return <LearnScreen />;
  }

  return <LearnAndQuizHub />;
}
