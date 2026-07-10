import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loading } from '@/components';
import { WordSelectionSheet } from '@/features/roleplay/components/WordSelectionSheet';
import { ROLEPLAY_SCENARIOS, type RoleplayScenario } from '@/features/roleplay/constants/scenarios';
import { useRoleplayStore } from '@/store/roleplay.store';
import { useTheme } from '@/theme/useTheme';

/**
 * Roleplay senaryo seçim ekranı.
 *
 * Kullanıcı bir senaryoya tıklar → kelime seçim sheet'i açılır →
 * kullanıcı 1-5 kelime seçer → sohbet başlatılır ve chat ekranına yönlendirilir.
 */
export default function RoleplayScenarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const startSession = useRoleplayStore((state) => state.startSession);
  const [isStarting, setIsStarting] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario | null>(null);

  const handleSelectScenario = useCallback((scenario: RoleplayScenario) => {
    setSelectedScenario(scenario);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSelectedScenario(null);
  }, []);

  const handleStartWithWords = useCallback(
    async (scenario: RoleplayScenario, targetWords: string[]) => {
      setSelectedScenario(null);
      setIsStarting(true);
      try {
        await startSession(scenario.title, targetWords);
        router.push('/roleplay/chat');
      } catch (error) {
        Alert.alert(
          'Hata',
          error instanceof Error ? error.message : 'Senaryo başlatılamadı',
        );
      } finally {
        setIsStarting(false);
      }
    },
    [startSession, router],
  );

  if (isStarting) {
    return <Loading message="Senaryo hazırlanıyor..." fullScreen />;
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-md">
          <View className="flex-row items-center gap-sm">
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Geri dön"
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full bg-muted active:opacity-80"
            >
              <Ionicons name="arrow-back" size={22} color={colors.foreground} />
            </Pressable>
          </View>
          <Text className="mt-md text-3xl font-bold text-foreground">AI Chat Partner</Text>
          <Text className="mt-xs text-sm text-muted-foreground">
            Öğrendiğin kelimeleri canlı senaryolarda pratik et
          </Text>
        </View>

        {/* Senaryo Kartları */}
        <View className="px-md mt-lg">
          <Text className="mb-md text-lg font-bold text-foreground">Senaryo Seç</Text>
          <View className="gap-md">
            {ROLEPLAY_SCENARIOS.map((scenario) => (
              <Pressable
                key={scenario.id}
                onPress={() => handleSelectScenario(scenario)}
                accessibilityRole="button"
                accessibilityLabel={`${scenario.titleTr} senaryosunu başlat`}
                className="active:opacity-80"
              >
                <View className="flex-row items-center rounded-2xl border border-border bg-card p-md">
                  <View className="mr-md h-14 w-14 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-900/40">
                    <Ionicons name={scenario.icon} size={28} color="#0891b2" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">
                      {scenario.titleTr}
                    </Text>
                    <Text className="mt-xs text-sm text-muted-foreground">
                      {scenario.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Kelime Seçim Sheet */}
      <WordSelectionSheet
        visible={selectedScenario !== null}
        scenario={selectedScenario}
        onClose={handleCloseSheet}
        onStart={handleStartWithWords}
      />
    </View>
  );
}