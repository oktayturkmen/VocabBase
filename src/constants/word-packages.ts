import type { Ionicons } from '@expo/vector-icons';

export type PackageCategory = 'general' | 'theme';

export type WordPackageDefinition = {
  id: string;
  packageName: string;
  displayTitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: PackageCategory;
  categoryLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any;
};

export const WORD_PACKAGES: WordPackageDefinition[] = [
  {
    id: 'a1_level',
    packageName: 'A1 Seviye',
    displayTitle: 'A1 Seviye',
    description: 'Başlangıç seviyesi temel kelimeler',
    icon: 'leaf-outline',
    category: 'general',
    categoryLabel: 'Genel Seviyeler',
    asset: require('@/assets/packages/a1_level.json'),
  },
  {
    id: 'a2_level',
    packageName: 'A2 Seviye',
    displayTitle: 'A2 Seviye',
    description: 'Temel-orta seviye kelimeler',
    icon: 'trending-up-outline',
    category: 'general',
    categoryLabel: 'Genel Seviyeler',
    asset: require('@/assets/packages/a2_level.json'),
  },
  {
    id: 'b1_level',
    packageName: 'B1 Seviye',
    displayTitle: 'B1 Seviye',
    description: 'Orta seviye kelimeler',
    icon: 'school-outline',
    category: 'general',
    categoryLabel: 'Genel Seviyeler',
    asset: require('@/assets/packages/b1_level.json'),
  },
  {
    id: 'b2_level',
    packageName: 'B2 Seviye',
    displayTitle: 'B2 Seviye',
    description: 'Orta-ileri seviye kelimeler',
    icon: 'library-outline',
    category: 'general',
    categoryLabel: 'Genel Seviyeler',
    asset: require('@/assets/packages/b2_level.json'),
  },
  {
    id: 'travel',
    packageName: 'Seyahat',
    displayTitle: 'Seyahat',
    description: 'Havaalanı, otel ve yolculuk kelimeleri',
    icon: 'airplane-outline',
    category: 'theme',
    categoryLabel: 'Özel Temalar',
    asset: require('@/assets/packages/travel.json'),
  },
];

export const INITIAL_PACKAGE_NAME = 'A1 Seviye';

export const DEFAULT_PACKAGE_NAME = 'Başlangıç Paketi';

export type LocalPackageWord = {
  word: string;
  meaning: string;
  example?: string;
};

export type PackageLoadResult = {
  success: boolean;
  imported: number;
  skipped: number;
  error?: string;
};
