import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, FadeIn } from '@/components';
import {
  WORD_PACKAGES,
  type PackageCategory,
  type WordPackageDefinition,
} from '@/constants/word-packages';
import { getImportService } from '@/services/import';
import { getDatabase } from '@/database/client';
import { createWordService } from '@/services/word';
import { isPackageInstalled, uninstallPackage } from '@/services/package/package-install.service';
import { usePackageStore } from '@/store/package.store';
import { useWordStore } from '@/store/word.store';
import { useLearningStore } from '@/store/learning.store';
import { useReviewStore } from '@/store/review.store';
import { useListStore } from '@/store/list.store';
import { useStatisticStore } from '@/store/statistic.store';
import { useTheme } from '@/theme/useTheme';

// ─── Paket Kartı Bileşeni ───────────────────────────────────────────────────

type PackageCardProps = {
  pkg: WordPackageDefinition;
  wordCount: number;
  isLoaded: boolean;
  isLoading: boolean;
  onLoad: (pkg: WordPackageDefinition) => void;
  onUninstall: (pkg: WordPackageDefinition) => void;
};

function PackageCard({
  pkg,
  wordCount,
  isLoaded,
  isLoading,
  onLoad,
  onUninstall,
}: PackageCardProps) {
  const { colors } = useTheme();
  const { activePackageName, setActivePackageName } = usePackageStore();
  const isActive = activePackageName === pkg.packageName;

  const handlePress = useCallback(() => {
    if (!isLoaded && !isLoading) {
      onLoad(pkg);
    }
  }, [isLoaded, isLoading, onLoad, pkg]);

  const handleSetActive = useCallback(() => {
    if (isLoaded) {
      setActivePackageName(pkg.packageName);
    }
  }, [isLoaded, pkg.packageName, setActivePackageName]);

  return (
    <View
      className={`rounded-2xl bg-card p-lg border ${
        isActive ? 'border-primary/60 shadow-md shadow-primary/5' : 'border-border shadow-sm'
      }`}
    >
      {/* Üst Kısım: İkon, Başlık ve Aktif Rozeti */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center flex-1 pr-sm">
          {/* İkon Kutusu */}
          <View className="mr-md h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Ionicons name={pkg.icon} size={24} color={colors.primary} />
          </View>

          <View className="flex-1 pr-xs">
            <Text className="text-base font-bold text-foreground">{pkg.displayTitle}</Text>
            <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={2}>
              {pkg.description}
            </Text>
            
            {/* Yüklendi Durum Pilli (Eğer yüklenmişse gösterilir, ilerleme çubuğu/yüzde yoktur) */}
            {isLoaded ? (
              <View className="mt-sm self-start rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-900/40">
                <Text className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Yüklendi ({wordCount} Kelime)
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Aktif Rozeti */}
        {isActive && (
          <View className="flex-row items-center gap-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 px-2.5 py-1 rounded-full">
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Aktif</Text>
          </View>
        )}
      </View>

      {/* Aksiyon Butonu (Aktif Olmayan Paketler İçin Tekli Buton ve Çöp Kutusu) */}
      {!isActive && (
        <View className="mt-lg flex-row gap-sm">
          {isLoaded ? (
            <Pressable
              onPress={handleSetActive}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel="Aktif Et"
              accessibilityState={{ disabled: isLoading, busy: isLoading }}
              className="flex-1 flex-row items-center justify-center rounded-xl py-2.5 bg-transparent border-[1.5px] border-primary active:bg-primary/10"
            >
              {isLoading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={{ color: colors.primary }} className="text-sm font-semibold">
                  Aktif Et
                </Text>
              )}
            </Pressable>
          ) : (
            <Button
              title="Yükle"
              onPress={handlePress}
              loading={isLoading}
              className="flex-1 rounded-xl py-2.5 bg-primary"
              textClassName="font-semibold text-white text-sm"
            />
          )}
          {isLoaded && (
            <Pressable
              onPress={() => onUninstall(pkg)}
              accessibilityRole="button"
              accessibilityLabel="Paketi sil"
              className="w-11 h-11 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 active:opacity-75"
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Paket Bölüm Bileşeni ───────────────────────────────────────────────────

type PackageSectionProps = {
  title: string;
  packages: WordPackageDefinition[];
  loadedMap: Record<string, boolean>;
  wordCountMap: Record<string, number>;
  loadingPackageId: string | null;
  onLoad: (pkg: WordPackageDefinition) => void;
  onUninstall: (pkg: WordPackageDefinition) => void;
};

function PackageSection({
  title,
  packages,
  loadedMap,
  wordCountMap,
  loadingPackageId,
  onLoad,
  onUninstall,
}: PackageSectionProps) {
  if (packages.length === 0) {
    return null;
  }

  return (
    <View className="mb-xl">
      <Text className="mb-md text-lg font-bold text-foreground">{title}</Text>
      <View className="gap-md">
        {packages.map((pkg, index) => (
          <FadeIn key={pkg.id} duration={400} delay={index * 80}>
            <PackageCard
              pkg={pkg}
              isLoaded={loadedMap[pkg.packageName] ?? false}
              wordCount={wordCountMap[pkg.packageName] ?? 0}
              isLoading={loadingPackageId === pkg.id}
              onLoad={onLoad}
              onUninstall={onUninstall}
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

// ─── Ana Sayfa Bileşeni ─────────────────────────────────────────────────────

export default function WordPackagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [wordCountMap, setWordCountMap] = useState<Record<string, number>>({});
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(true);

  const refreshPackageStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const database = await getDatabase();
      const wordService = createWordService(database);
      const nextLoaded: Record<string, boolean> = {};
      const nextCounts: Record<string, number> = {};

      for (const pkg of WORD_PACKAGES) {
        const installed = await isPackageInstalled(database, pkg.packageName);
        const dbLoaded = await wordService.isPackageLoaded(pkg.packageName);
        nextLoaded[pkg.packageName] = installed || dbLoaded;

        const totalCount = dbLoaded ? await wordService.getPackageWordCount(pkg.packageName) : 0;
        nextCounts[pkg.packageName] = totalCount;
      }

      setLoadedMap(nextLoaded);
      setWordCountMap(nextCounts);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void refreshPackageStatus();
    });
  }, [refreshPackageStatus]);

  const groupedPackages = useMemo(() => {
    const groups: Record<PackageCategory, WordPackageDefinition[]> = {
      general: [],
      theme: [],
    };

    for (const pkg of WORD_PACKAGES) {
      groups[pkg.category].push(pkg);
    }

    return groups;
  }, []);

  const handleLoadPackage = useCallback(
    async (pkg: WordPackageDefinition) => {
      setLoadingPackageId(pkg.id);

      try {
        const importService = getImportService();
        const result = await importService.loadLocalPackage(pkg.asset, pkg.packageName);

        if (result.success) {
          Alert.alert(
            'Paket Yüklendi',
            `${pkg.displayTitle} paketinden ${result.imported} kelime başarıyla kütüphanenize eklendi.${
              result.skipped > 0
                ? ` ${result.skipped} kelime zaten kütüphanenizde olduğu için atlandı.`
                : ''
            }`,
          );
          await refreshPackageStatus();
        }
      } finally {
        setLoadingPackageId(null);
      }
    },
    [refreshPackageStatus],
  );

  const handleUninstallPackage = useCallback(
    async (pkg: WordPackageDefinition) => {
      Alert.alert(
        'Paketi Kaldır',
        `"${pkg.displayTitle}" paketini ve bu pakete ait öğrenme ilerlemenizi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Evet, Sil',
            style: 'destructive',
            onPress: async () => {
              setLoadingPackageId(pkg.id);
              try {
                const database = await getDatabase();
                await uninstallPackage(database, pkg.packageName);

                // Zustand Store'larını sıfırla/yenile
                useWordStore.getState().reset();
                useLearningStore.getState().reset();
                useReviewStore.getState().reset();
                useListStore.getState().reset();
                useStatisticStore.getState().reset();

                // Verileri yeniden yükle
                void useWordStore.getState().fetchWords();
                void useListStore.getState().fetchLists();
                void useReviewStore.getState().fetchDueReviews();
                void useStatisticStore.getState().fetchTodayStatistic();
                void useStatisticStore.getState().fetchRecentStatistics(30);
                void useLearningStore.getState().fetchUnlearnedCount();
                void useLearningStore.getState().fetchTotalWordCount();

                // Eğer silinen paket aktif paket ise, aktif paketi sıfırla
                if (usePackageStore.getState().activePackageName === pkg.packageName) {
                  usePackageStore.getState().setActivePackageName('');
                }

                Alert.alert('Başarılı', `"${pkg.displayTitle}" paketi başarıyla kaldırıldı.`);
                await refreshPackageStatus();
              } catch (error) {
                Alert.alert(
                  'Hata',
                  error instanceof Error ? error.message : 'Paket kaldırılırken bir hata oluştu.'
                );
              } finally {
                setLoadingPackageId(null);
              }
            },
          },
        ]
      );
    },
    [refreshPackageStatus]
  );

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 42 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Apple HIG Uyumlu Geniş Header */}
        <View className="px-lg" style={{ paddingTop: insets.top + 20 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            className="mb-lg h-10 w-10 items-center justify-center rounded-full bg-card border border-border active:opacity-85 shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
          </Pressable>

          <Text className="text-3xl font-bold text-foreground">Kelime Paketleri</Text>
          <Text className="mt-xs text-sm text-muted-foreground leading-relaxed">
            Hazır kelime paketlerini yükleyerek çalışmaya ve öğrenmeye hemen başlayın.
          </Text>
        </View>

        <View className="px-lg mt-xl">
          {isRefreshing ? (
            <View className="items-center py-xl">
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              <PackageSection
                title="Genel Seviyeler"
                packages={groupedPackages.general}
                loadedMap={loadedMap}
                wordCountMap={wordCountMap}
                loadingPackageId={loadingPackageId}
                onLoad={handleLoadPackage}
                onUninstall={handleUninstallPackage}
              />
              <PackageSection
                title="Özel Temalar"
                packages={groupedPackages.theme}
                loadedMap={loadedMap}
                wordCountMap={wordCountMap}
                loadingPackageId={loadingPackageId}
                onLoad={handleLoadPackage}
                onUninstall={handleUninstallPackage}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
