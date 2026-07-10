import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

import { Button } from '@/components';
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
      setWordData(null);
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
            <Text className="text-lg font-bold text-foreground">Kelime Detayı</Text>
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
              <Text className="text-center text-sm text-muted-foreground py-lg">
                Yükleniyor...
              </Text>
            ) : wordData ? (
              <View>
                {/* Word */}
                <View className="flex-row items-center justify-between mb-md">
                  <Text className="text-3xl font-bold text-foreground">
                    {wordData.word}
                  </Text>
                  <Pressable
                    onPress={handleSpeak}
                    accessibilityRole="button"
                    accessibilityLabel="Kelimeyi seslendir"
                    className="h-12 w-12 items-center justify-center rounded-full bg-primary/10"
                  >
                    <Ionicons name="volume-high-outline" size={24} color={colors.primary} />
                  </Pressable>
                </View>

                {/* Meaning */}
                <View className="rounded-xl bg-muted/50 p-md mb-md">
                  <Text className="text-xs font-semibold uppercase text-muted-foreground mb-xs">
                    Anlam
                  </Text>
                  <Text className="text-base text-foreground">{wordData.meaning}</Text>
                </View>

                {/* Example */}
                {wordData.example ? (
                  <View className="rounded-xl bg-muted/50 p-md mb-md">
                    <Text className="text-xs font-semibold uppercase text-muted-foreground mb-xs">
                      Örnek Cümle
                    </Text>
                    <Text className="text-base italic text-foreground">
                      {wordData.example}
                    </Text>
                  </View>
                ) : null}

                {/* Pronunciation */}
                {wordData.pronunciation ? (
                  <View className="rounded-xl bg-muted/50 p-md mb-md">
                    <Text className="text-xs font-semibold uppercase text-muted-foreground mb-xs">
                      Telaffuz
                    </Text>
                    <Text className="text-base text-foreground">
                      {wordData.pronunciation}
                    </Text>
                  </View>
                ) : null}

                {/* Close Button */}
                <Button
                  title="Kapat"
                  variant="secondary"
                  size="md"
                  onPress={onClose}
                  className="mt-md"
                />
              </View>
            ) : (
              <View className="py-lg">
                <Text className="text-center text-base text-muted-foreground mb-sm">
                  Bu kelime veritabanında bulunamadı.
                </Text>
                <Text className="text-center text-sm text-muted-foreground">
                  &ldquo;{word}&rdquo; kelimesini kütüphanenize ekleyebilirsiniz.
                </Text>
                <Button
                  title="Kapat"
                  variant="secondary"
                  size="md"
                  onPress={onClose}
                  className="mt-md"
                />
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
});