import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import { getDatabase } from '@/database/client';
import { createWordService } from '@/services/word';
import { useAppSettingsStore } from '@/store/app-settings.store';
import { useTheme } from '@/theme/useTheme';
import type { Word } from '@/types/word';

type WordDetailSheetProps = {
  visible: boolean;
  word: string | null;
  onClose: () => void;
};

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  isItalic?: boolean;
};

function InfoRow({ icon, iconColor, iconBg, label, value, isItalic }: InfoRowProps) {
  return (
    <View className="flex-row items-start rounded-2xl bg-muted/50 p-md mb-sm">
      <View className={`mr-md h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-xs">
          {label}
        </Text>
        <Text className={`text-base text-foreground ${isItalic ? 'italic' : ''}`}>
          {value}
        </Text>
      </View>
    </View>
  );
}

export const WordDetailSheet = React.memo(function WordDetailSheet({
  visible,
  word,
  onClose,
}: WordDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { speechSpeed } = useAppSettingsStore();
  const [wordData, setWordData] = useState<Word | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!visible || !word) {
      Promise.resolve().then(() => {
        setWordData(null);
      });
      return;
    }

    let isMounted = true;

    const fetchWordDetail = async () => {
      setIsLoading(true);
      try {
        const database = await getDatabase();
        const wordService = createWordService(database);
        const found = await wordService.getByWord(word);

        if (isMounted) {
          setWordData(found);
        }
      } catch {
        if (isMounted) {
          setWordData(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchWordDetail();

    return () => {
      isMounted = false;
    };
  }, [visible, word]);

  const handleSpeak = useCallback(() => {
    if (!word) return;
    Speech.speak(word, {
      language: 'en-US',
      rate: speechSpeed,
    });
  }, [word, speechSpeed]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50" onPress={onClose}>
        <Pressable
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-card shadow-xl"
          style={{ paddingBottom: insets.bottom + 16 }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Grab handle */}
          <View className="self-center w-10 h-1 rounded-full bg-muted-foreground/30 mt-sm mb-md" />

          {/* Header */}
          <View className="flex-row items-center justify-between px-md pb-md">
            <View className="flex-row items-center gap-2">
              <Ionicons name="language-outline" size={22} color={colors.primary} />
              <Text className="text-lg font-bold text-foreground">Kelime Detayı</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-muted"
            >
              <Ionicons name="close" size={20} color={colors.foreground} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          >
            {isLoading ? (
              <View className="items-center py-xl">
                <Text className="text-sm text-muted-foreground">Yükleniyor...</Text>
              </View>
            ) : wordData ? (
              <View>
                {/* Word Hero */}
                <View className="relative overflow-hidden rounded-2xl bg-primary/5 dark:bg-primary/10 p-lg mb-md">
                  <View className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/10" />
                  <View className="relative flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-3xl font-bold text-foreground">
                        {wordData.word}
                      </Text>
                      {wordData.pronunciation ? (
                        <Text className="text-sm text-muted-foreground mt-xs font-mono">
                          {wordData.pronunciation}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={handleSpeak}
                      accessibilityRole="button"
                      accessibilityLabel="Kelimeyi seslendir"
                      className="h-12 w-12 items-center justify-center rounded-full bg-primary/15 active:bg-primary/25"
                    >
                      <Ionicons name="volume-high-outline" size={24} color={colors.primary} />
                    </Pressable>
                  </View>
                </View>

                {/* Info Rows */}
                <InfoRow
                  icon="language-outline"
                  iconColor="#0D9488"
                  iconBg="bg-primary/15"
                  label="Anlam"
                  value={wordData.meaning}
                />

                {wordData.example ? (
                  <InfoRow
                    icon="chatbubble-ellipses-outline"
                    iconColor="#4f46e5"
                    iconBg="bg-indigo-100 dark:bg-indigo-900/40"
                    label="Örnek Cümle"
                    value={wordData.example}
                    isItalic
                  />
                ) : null}

                {wordData.pronunciation ? (
                  <InfoRow
                    icon="mic-outline"
                    iconColor="#7c3aed"
                    iconBg="bg-purple-100 dark:bg-purple-900/40"
                    label="Telaffuz"
                    value={wordData.pronunciation}
                  />
                ) : null}

                {/* Close Button */}
                <Pressable
                  onPress={onClose}
                  className="mt-md h-12 items-center justify-center rounded-xl bg-muted active:opacity-80"
                  accessibilityRole="button"
                  accessibilityLabel="Kapat"
                >
                  <Text className="text-base font-semibold text-foreground">Kapat</Text>
                </Pressable>
              </View>
            ) : (
              <View className="items-center py-xl">
                <View className="mb-md h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Ionicons name="search-outline" size={28} color={colors.mutedForeground} />
                </View>
                <Text className="text-base text-muted-foreground text-center mb-sm">
                  Bu kelime veritabanında bulunamadı.
                </Text>
                <Text className="text-sm text-muted-foreground text-center">
                  &ldquo;{word}&rdquo; kelimesini kütüphanenize ekleyebilirsiniz.
                </Text>
                <Pressable
                  onPress={onClose}
                  className="mt-md h-12 items-center justify-center rounded-xl bg-muted active:opacity-80 px-xl"
                  accessibilityRole="button"
                  accessibilityLabel="Kapat"
                >
                  <Text className="text-base font-semibold text-foreground">Kapat</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});