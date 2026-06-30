import { memo } from 'react';
import { Pressable, Text } from 'react-native';

import { Card } from '@/components/Card';
import type { Word } from '@/types/word';

type WordListItemProps = {
  word: Word;
  onPress?: (word: Word) => void;
};

function WordListItemComponent({ word, onPress }: WordListItemProps) {
  return (
    <Pressable
      onPress={() => onPress?.(word)}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${word.word}. ${word.meaning}`}
      accessibilityHint="Opens word details"
      accessibilityState={{ disabled: !onPress }}
    >
      <Card className="mx-md mb-sm">
        <Text className="text-lg font-semibold text-card-foreground">{word.word}</Text>
        <Text className="mt-xs text-base text-muted-foreground">{word.meaning}</Text>
        {word.example ? (
          <Text className="mt-xs text-sm text-muted-foreground" numberOfLines={2}>
            {word.example}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

export const WordListItem = memo(WordListItemComponent);
