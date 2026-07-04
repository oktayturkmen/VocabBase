import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/theme/useTheme';
import type { Word } from '@/types/word';

type WordListItemProps = {
  word: Word;
  onPress?: (word: Word) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (word: Word) => void;
};

function WordListItemComponent({
  word,
  onPress,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: WordListItemProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (isSelectionMode && onToggleSelect) {
      onToggleSelect(word);
    } else {
      onPress?.(word);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress && !onToggleSelect}
      accessibilityRole="button"
      accessibilityLabel={`${word.word}. ${word.meaning}`}
      accessibilityHint={isSelectionMode ? 'Seçimi değiştir' : 'Kelime detaylarını açar'}
      accessibilityState={{ disabled: !onPress && !onToggleSelect, selected: isSelected }}
      className="mb-sm flex-row items-center justify-between rounded-xl bg-indigo-50/40 dark:bg-muted/30 px-md py-sm active:opacity-70"
    >
      <View className="flex-1 flex-row items-center">
        {isSelectionMode ? (
          <View className="mr-sm">
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={isSelected ? colors.primary : colors.border}
            />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{word.word}</Text>
          <Text className="mt-xs text-sm text-muted-foreground">{word.meaning}</Text>
        </View>
      </View>
      {!isSelectionMode ? (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      ) : null}
    </Pressable>
  );
}

export const WordListItem = memo(WordListItemComponent);
