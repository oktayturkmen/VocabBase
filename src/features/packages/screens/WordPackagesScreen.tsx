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
import { isPackageInstalled } from '@/services/package/package-install.service';
import { usePackageStore } from '@/store/package.store';
import { useTheme } from '@/theme/useTheme';

type PackageCardProps = {
  pkg: WordPackageDefinition;
  wordCount: number;
  isLoaded: boolean;
  isLoading: boolean;
  onLoad: (pkg: WordPackageDefinition) => void;
};

function PackageCard({ pkg, wordCount, isLoaded, isLoading, onLoad }: PackageCardProps) {
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
    <View className="rounded-2xl border border-border bg-card p-md shadow-sm">
      <View className="flex-row items-start">
        <View className="mr-md h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Ionicons name={pkg.icon} size={24} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-foreground">{pkg.displayTitle}</Text>
          <Text className="mt-xs text-sm text-muted-foreground">{pkg.description}</Text>
          {isLoaded ? (
            <View className="mt-sm self-start rounded-full bg-emerald-100 px-sm py-xs dark:bg-emerald-900/40">
              <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Yüklendi ({wordCount} Kelime)
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="mt-md flex-row gap-sm">
        <Button
          title={isLoaded ? 'Yüklendi' : 'Yükle'}
          onPress={handlePress}
          disabled={isLoaded || isLoading}
          loading={isLoading}
          className={`flex-1 rounded-xl ${isLoaded ? 'bg-muted' : 'bg-primary'}`}
          textClassName={isLoaded ? 'text-muted-foreground font-semibold' : 'text-white font-semibold'}
        />
        {isLoaded && (
          <Button
            title={isActive ? 'Şu An Aktif' : 'Aktif Et'}
            onPress={handleSetActive}
            disabled={isActive}
            className={`flex-1 rounded-xl ${isActive ? 'bg-emerald-500' : 'bg-primary'}`}
            textClassName="text-white font-semibold"
          />
        )}
      </View>
    </View>
  );
}

type PackageSectionProps = {
  title: string;
  packages: WordPackageDefinition[];
  loadedMap: Record<string, boolean>;
  wordCountMap: Record<string, number>;
  loadingPackageId: string | null;
  onLoad: (pkg: WordPackageDefinition) => void;
};

function PackageSection({
  title,
  packages,
  loadedMap,
  wordCountMap,
  loadingPackageId,
  onLoad,
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
            />
          </FadeIn>
        ))}
      </View>
    </View>
  );
}

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
        nextCounts[pkg.packageName] = dbLoaded
          ? await wordService.getPackageWordCount(pkg.packageName)
          : 0;
      }

      setLoadedMap(nextLoaded);
      setWordCountMap(nextCounts);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refreshPackageStatus();
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
            'Paket yüklendi',
            `${pkg.displayTitle} paketinden ${result.imported} kelime eklendi.${
              result.skipped > 0 ? ` ${result.skipped} kelime zaten mevcut olduğu için atlandı.` : ''
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

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-md" style={{ paddingTop: insets.top + 8 }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Geri dön"
            className="mb-md h-10 w-10 items-center justify-center rounded-full bg-muted"
          >
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>

          <Text className="text-3xl font-bold text-foreground">Kelime Paketleri</Text>
          <Text className="mt-xs text-sm text-muted-foreground">
            Hazır kelime paketlerini indir ve öğrenmeye başla
          </Text>
        </View>

        <View className="px-md mt-lg">
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
              />
              <PackageSection
                title="Özel Temalar"
                packages={groupedPackages.theme}
                loadedMap={loadedMap}
                wordCountMap={wordCountMap}
                loadingPackageId={loadingPackageId}
                onLoad={handleLoadPackage}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
