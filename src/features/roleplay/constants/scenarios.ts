import type { Ionicons } from '@expo/vector-icons';

/**
 * Roleplay senaryosu konfigürasyonu.
 * - `id`: Benzersiz tanımlayıcı (route parametresi olarak kullanılır)
 * - `title`: İngilizce senaryo adı (AI'a gönderilir ve header'da gösterilir)
 * - `titleTr`: Türkçe adı (senaryo seçim ekranında gösterilir)
 * - `icon`: Ionicons ikon adı
 * - `description`: Kısa açıklama
 */
export type RoleplayScenario = {
  id: string;
  title: string;
  titleTr: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
};

/**
 * Kullanıcının seçebileceği tüm roleplay senaryoları.
 * Her senaryo, AI'ın bürüneceği bir karakter/durum temsil eder.
 */
export const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'job-interview',
    title: 'Job Interview',
    titleTr: 'İş Mülakatı',
    icon: 'briefcase-outline',
    description: 'Profesyonel mülakat sorularına cevap ver',
  },
  {
    id: 'cafe',
    title: 'Cafe',
    titleTr: 'Kafe',
    icon: 'cafe-outline',
    description: 'Sipariş ver ve sohbet et',
  },
  {
    id: 'airport',
    title: 'Airport',
    titleTr: 'Havaalanı',
    icon: 'airplane-outline',
    description: 'Check-in, güvenlik ve boarding',
  },
  {
    id: 'hotel',
    title: 'Hotel',
    titleTr: 'Otel',
    icon: 'bed-outline',
    description: 'Giriş yap ve servis talep et',
  },
  {
    id: 'shopping',
    title: 'Shopping',
    titleTr: 'Alışveriş',
    icon: 'cart-outline',
    description: 'Ürün ve fiyat sor, satın al',
  },
  {
    id: 'doctor',
    title: "Doctor's Visit",
    titleTr: 'Doktor Ziyareti',
    icon: 'medkit-outline',
    description: 'Belirti tanımla ve talimatları anla',
  },
];