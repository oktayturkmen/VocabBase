import React from 'react';
import { View, Text } from 'react-native';

import type { RoleplayMessage } from '@/services/ai/roleplay.service';
import { cn } from '@/utils/cn';

type ChatMessageProps = {
  message: RoleplayMessage;
};

/**
 * Sohbet ekranında tek bir mesajı render eder.
 *
 * - AI (model) mesajları: Sola dayalı, koyu arka plan
 * - Kullanıcı (user) mesajları: Sağa dayalı, cyan/mavi arka plan
 *
 * Modern chat uygulamalarındaki baloncuk tasarımını takip eder.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <View className={cn('flex-row px-md', isUser ? 'justify-end' : 'justify-start')}>
      <View
        className={cn(
          'max-w-[80%] rounded-2xl px-md py-sm',
          isUser
            ? 'bg-cyan-500 dark:bg-cyan-600'
            : 'bg-muted dark:bg-slate-800',
        )}
      >
        <Text
          className={cn(
            'text-sm',
            isUser ? 'text-white' : 'text-foreground',
          )}
        >
          {message.text}
        </Text>
      </View>
    </View>
  );
}