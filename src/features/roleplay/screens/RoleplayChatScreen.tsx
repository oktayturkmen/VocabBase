import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatMessage } from '@/features/roleplay/components/ChatMessage';
import { TargetWordBadge } from '@/features/roleplay/components/TargetWordBadge';
import { useRoleplayStore } from '@/store/roleplay.store';
import { useTheme } from '@/theme/useTheme';

/**
 * Roleplay tam ekran chat ekranı.
 *
 * Yapı:
 * - Üst: Geri butonu + senaryo adı
 * - Orta: Hedef kelimeler (yatay badge listesi)
 * - Gövde: Mesajlaşma alanı (AI solda, kullanıcı sağda)
 * - Alt: TextInput + Gönder butonu
 *
 * Alt tab bar bu ekranda gizlidir (route _layout'ta headerShown: false).
 */
export default function RoleplayChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const scenario = useRoleplayStore((state) => state.scenario);
  const targetWords = useRoleplayStore((state) => state.targetWords);
  const messages = useRoleplayStore((state) => state.messages);
  const usedWords = useRoleplayStore((state) => state.usedWords);
  const status = useRoleplayStore((state) => state.status);
  const error = useRoleplayStore((state) => state.error);
  const sendMessage = useRoleplayStore((state) => state.sendMessage);
  const resetSession = useRoleplayStore((state) => state.resetSession);

  const [inputText, setInputText] = useState('');

  // Yeni mesaj geldiğinde sohbeti en alta kaydır
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleGoBack = useCallback(() => {
    resetSession();
    router.back();
  }, [resetSession, router]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || status === 'loading') {
      return;
    }
    setInputText('');
    void sendMessage(text);
  }, [inputText, status, sendMessage]);

  const isInputDisabled = status === 'loading';

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View
          className="flex-row items-center border-b border-border px-md pb-sm"
          style={{ paddingTop: insets.top + 8 }}
        >
          <Pressable
            onPress={handleGoBack}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-80"
          >
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <View className="ml-sm flex-1">
            <Text className="text-lg font-bold text-foreground">{scenario ?? 'Roleplay'}</Text>
            <Text className="text-xs text-muted-foreground">AI Chat Partner</Text>
          </View>
          {status === 'loading' ? (
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.mutedForeground} />
          ) : null}
        </View>

        {/* Hedef Kelimeler */}
        <View className="border-b border-border px-md py-sm">
          <Text className="mb-xs text-xs font-semibold text-muted-foreground">
            Hedef Kelimeler
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6 }}
          >
            {targetWords.map((word) => (
              <TargetWordBadge
                key={word}
                word={word}
                used={usedWords.includes(word)}
              />
            ))}
          </ScrollView>
        </View>

        {/* Mesajlaşma Alanı */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{
            paddingVertical: 16,
            gap: 10,
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}

          {status === 'loading' && messages.length > 0 ? (
            <View className="flex-row px-md">
              <View className="rounded-2xl bg-muted dark:bg-slate-800 px-md py-sm">
                <Text className="text-sm text-muted-foreground">AI yazıyor...</Text>
              </View>
            </View>
          ) : null}

          {error ? (
            <View className="mx-md rounded-2xl bg-error/10 px-md py-sm">
              <Text className="text-sm text-error">{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* Input Alanı */}
        <View
          className="flex-row items-center border-t border-border px-md pt-sm"
          style={{ paddingBottom: insets.bottom + 8 }}
        >
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Mesajını yaz..."
            placeholderTextColor={colors.mutedForeground}
            editable={!isInputDisabled}
            multiline
            maxLength={500}
            className="flex-1 rounded-2xl bg-muted px-md py-sm text-sm text-foreground"
            style={{ maxHeight: 100 }}
          />
          <Pressable
            onPress={handleSend}
            disabled={isInputDisabled || !inputText.trim()}
            accessibilityRole="button"
            accessibilityLabel="Mesaj gönder"
            hitSlop={8}
            className="ml-sm h-12 w-12 items-center justify-center rounded-full bg-cyan-500 active:opacity-80 disabled:opacity-40"
          >
            <Ionicons name="send" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}