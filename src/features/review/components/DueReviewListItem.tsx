import { memo } from 'react';
import { Text, View } from 'react-native';

import { Card } from '@/components/Card';
import { formatReviewDueLabel } from '@/features/review/utils/review.utils';
import type { ReviewWithWord } from '@/types/review';

type DueReviewListItemProps = {
  review: ReviewWithWord;
};

function DueReviewListItemComponent({ review }: DueReviewListItemProps) {
  const dueLabel = formatReviewDueLabel(review.nextReviewAt);

  return (
    <Card
      className="mx-md mb-sm border border-border"
      accessible
      accessibilityLabel={`${review.word.word}. ${review.word.meaning}. ${dueLabel}. Repetition ${review.repetitions}.`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-sm">
          <Text className="text-lg font-semibold text-foreground">{review.word.word}</Text>
          <Text className="mt-xs text-base text-muted-foreground">{review.word.meaning}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs font-semibold text-primary">{dueLabel}</Text>
          <Text className="mt-xs text-xs text-muted-foreground">Rep {review.repetitions}</Text>
        </View>
      </View>
    </Card>
  );
}

export const DueReviewListItem = memo(DueReviewListItemComponent);
