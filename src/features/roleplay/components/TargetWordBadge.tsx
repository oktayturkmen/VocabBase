import React from 'react';
import { View, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { cn } from '@/utils/cn';

type TargetWordBadgeProps = {
  word: string;
  used: boolean;
};

/**
 * Hedef kelime badge'i.
 *
 * - Kullanılmamış kelimeler: Koyu arka plan, normal yazı
 * - Kullanılmış kelimeler: Yeşil arka plan, checkmark ikonu
 *
 * Kullanıcı kelimeyi doğru bağlamda kullandıkça rengi yeşile döner.
 */
export function TargetWordBadge({ word, used }: TargetWordBadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center rounded-full px-sm py-xs',
        used
          ? 'bg-emerald-500 dark:bg-emerald-600'
          : 'bg-muted dark:bg-slate-700',
      )}
    >
      {used ? (
        <Ionicons name="checkmark-circle" size={14} color="#fff" />
      ) : null}
      <Text
        className={cn(
          'ml-xs text-xs font-semibold',
          used ? 'text-white' : 'text-muted-foreground',
        )}
      >
        {word}
      </Text>
    </View>
  );
}