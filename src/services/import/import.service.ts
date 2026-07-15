import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { extractText, isAvailable } from 'expo-pdf-text-extract';
import { Alert, Platform } from 'react-native';

import type { LocalPackageWord, PackageLoadResult } from '@/constants/word-packages';
import {
  isPackageInstalled,
  markPackageInstalled,
} from '@/services/package/package-install.service';
import { getDatabase } from '@/database/client';
import { createWordService, PackageAlreadyLoadedError } from '../word';

export type ImportResult = {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
};

// Import edilen kelimeler için maksimum uzunluk sınırları
const MAX_WORD_LENGTH = 150;
const MAX_MEANING_LENGTH = 800;
const MAX_EXAMPLE_LENGTH = 1000;
const MAX_PRONUNCIATION_LENGTH = 200;

export type ParsedWord = {
  word: string;
  meaning: string;
  example?: string;
  pronunciation?: string;
};

export class ImportFilePickerError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ImportFilePickerError';
  }
}

export class ImportParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ImportParseError';
  }
}

export class ImportService {
  async pickCSVFile(): Promise<string | null> {
    try {
      // Mobilde bazı dosya yöneticileri CSV dosyaları için doğru MIME type
      // bildirmediğinden, tüm dosyaları gösterip uzantıyı manuel kontrol ediyoruz.
      // Web'de ise daha spesifik filtreleme yapıyoruz.
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? ['text/csv', '.csv'] : '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Mobilde tüm dosyalar gösterildiği için uzantıyı kontrol et
      if (Platform.OS !== 'web') {
        const name = asset.name ?? '';
        const lowerName = name.toLowerCase();
        if (!lowerName.endsWith('.csv')) {
          throw new ImportFilePickerError(
            'Lütfen .csv uzantılı bir dosya seçin.',
          );
        }
      }

      return asset.uri;
    } catch (error) {
      if (error instanceof ImportFilePickerError) {
        throw error;
      }
      throw new ImportFilePickerError(
        error instanceof Error ? error.message : 'CSV dosyası seçilemedi',
        error,
      );
    }
  }

  async pickPDFFile(): Promise<string | null> {
    try {
      // Mobilde bazı dosya yöneticileri PDF için doğru MIME type bildirmeyebilir;
      // bu yüzden hem MIME type hem de uzantı filtresi birlikte kullanılır.
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? ['application/pdf', '.pdf'] : '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];

      // Mobilde tüm dosyalar gösterildiği için uzantıyı kontrol et
      if (Platform.OS !== 'web') {
        const name = asset.name ?? '';
        const lowerName = name.toLowerCase();
        if (!lowerName.endsWith('.pdf')) {
          throw new ImportFilePickerError(
            'Lütfen .pdf uzantılı bir dosya seçin.',
          );
        }
      }

      return asset.uri;
    } catch (error) {
      if (error instanceof ImportFilePickerError) {
        throw error;
      }
      throw new ImportFilePickerError(
        error instanceof Error ? error.message : 'PDF dosyası seçilemedi',
        error,
      );
    }
  }

  /**
   * URI'den dosya içeriğini okur.
   * Mobil platformlarda (Android/iOS) `fetch` `file://` şemasını desteklemediği
   * için `expo-file-system` kullanılır. Web'de ise `fetch` tercih edilir.
   *
   * SDK 56'da `FileSystem.readAsStringAsync` deprecated oldu; yerine
   * yeni `File` sınıfının `.text()` metodu kullanılır.
   */
  private async readFileContent(uri: string): Promise<string> {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      return response.text();
    }

    // Mobilde content:// veya file:// şemalarını güvenle okumak için
    // SDK 56 File sınıfı kullanılır.
    const file = new File(uri);
    return file.text();
  }

  async parseCSV(uri: string): Promise<ParsedWord[]> {
    try {
      const content = await this.readFileContent(uri);

      const words: ParsedWord[] = [];
      const rows = this.parseCSVContent(content);

      for (const row of rows) {
        // Boş satırları atla
        if (row.length === 0 || (row.length === 1 && !row[0].trim())) {
          continue;
        }

        // Header satırını atla
        const firstCell = row[0]?.toLowerCase() ?? '';
        const secondCell = row[1]?.toLowerCase() ?? '';
        if (firstCell.includes('word') && secondCell.includes('meaning')) {
          continue;
        }

        if (row.length >= 2) {
          const word = row[0].trim();
          const meaning = row[1].trim();
          const example = row[2]?.trim();
          const pronunciation = row[3]?.trim();

          // Uzunluk sınırlarını kontrol et
          if (word.length > MAX_WORD_LENGTH || meaning.length > MAX_MEANING_LENGTH) {
            continue; // Sınırı aşan kelimeleri atla
          }

          if (example && example.length > MAX_EXAMPLE_LENGTH) {
            continue; // Sınırı aşan örnekleri atla
          }

          if (pronunciation && pronunciation.length > MAX_PRONUNCIATION_LENGTH) {
            continue; // Sınırı aşan telaffuzları atla
          }

          words.push({
            word,
            meaning,
            example: example || undefined,
            pronunciation: pronunciation || undefined,
          });
        }
      }

      return words;
    } catch (error) {
      throw new ImportParseError(
        error instanceof Error ? error.message : 'CSV dosyası ayrıştırılamadı',
        error,
      );
    }
  }

  /**
   * CSV içeriğini satır satır parse eder.
   * Tırnak içine alınmış ve birden fazla satıra yayılan (multi-line quoted)
   * alanları güvenli bir şekilde destekler.
   */
  private parseCSVContent(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < content.length) {
      const char = content[i];

      if (inQuotes) {
        // Tırnak içindeyken: çift tırnak kaçışı kontrol et
        if (char === '"') {
          if (content[i + 1] === '"') {
            // Çift tırnak kaçışı: tek tırnak olarak ekle
            currentField += '"';
            i += 2;
            continue;
          }
          // Tırnak kapanışı
          inQuotes = false;
          i += 1;
          continue;
        }
        // Tırnak içindeki her karakter (newline dahil) olduğu gibi eklenir
        currentField += char;
        i += 1;
        continue;
      }

      // Tırnak dışında
      if (char === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }

      if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i += 1;
        continue;
      }

      if (char === '\r') {
        // \r\n veya \r: satır sonu olarak işle
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        // \r\n durumunda \n'i atla
        if (content[i + 1] === '\n') {
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i += 1;
        continue;
      }

      currentField += char;
      i += 1;
    }

    // Son alan/satırı ekle (dosya sonu)
    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      rows.push(currentRow);
    }

    return rows;
  }

  async parsePDF(uri: string): Promise<ParsedWord[]> {
    if (!isAvailable()) {
      throw new ImportParseError(
        'PDF metin çıkarma kullanılamıyor. Geliştirici derlemesi gereklidir.',
      );
    }

    try {
      const text = await extractText(uri);

      if (!text || text.trim().length === 0) {
        throw new ImportParseError('PDF dosyasında metin bulunamadı');
      }

      return this.parseTextToWords(text);
    } catch (error) {
      if (error instanceof ImportParseError) {
        throw error;
      }
      throw new ImportParseError(
        error instanceof Error ? error.message : 'PDF dosyası ayrıştırılamadı',
        error,
      );
    }
  }

  private parseTextToWords(text: string): ParsedWord[] {
    const words: ParsedWord[] = [];
    const lines = text.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      if (line.toLowerCase().includes('word') && line.toLowerCase().includes('meaning')) {
        continue;
      }

      const separators = [' - ', ' – ', ' : ', ' :" ', ' = ', '\t'];
      let parsed: ParsedWord | null = null;

      for (const separator of separators) {
        if (line.includes(separator)) {
          const parts = line.split(separator);
          if (parts.length >= 2) {
            parsed = {
              word: parts[0].trim(),
              meaning: parts[1].trim(),
            };
            break;
          }
        }
      }

      if (!parsed && line.includes(',')) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          parsed = {
            word: parts[0].trim(),
            meaning: parts[1].trim(),
          };
        }
      }

      if (!parsed) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          parsed = {
            word: parts[0],
            meaning: parts.slice(1).join(' '),
          };
        }
      }

      // Uzunluk sınırlarını kontrol et
      if (parsed && parsed.word && parsed.meaning) {
        if (parsed.word.length > MAX_WORD_LENGTH || parsed.meaning.length > MAX_MEANING_LENGTH) {
          continue; // Sınırı aşan kelimeleri atla
        }
        words.push(parsed);
      }
    }

    return words;
  }

  async importWords(words: ParsedWord[]): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
    };

    const database = await getDatabase();
    const wordService = createWordService(database);

    for (const parsedWord of words) {
      try {
        await wordService.create({
          word: parsedWord.word,
          meaning: parsedWord.meaning,
          example: parsedWord.example,
          pronunciation: parsedWord.pronunciation,
        });
        result.imported += 1;
      } catch (error) {
        result.failed += 1;
        result.errors.push(
          `"${parsedWord.word}" içe aktarılamadı: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`,
        );
      }
    }

    if (result.failed > 0) {
      result.success = false;
    }

    return result;
  }

  async importFromCSV(): Promise<ImportResult> {
    let uri: string | null;
    try {
      uri = await this.pickCSVFile();
    } catch (error) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [
          error instanceof Error ? error.message : 'Dosya seçimi başarısız oldu',
        ],
      };
    }

    if (!uri) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Dosya seçilmedi'],
      };
    }

    let words: ParsedWord[];
    try {
      words = await this.parseCSV(uri);
    } catch (error) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [
          error instanceof Error ? error.message : 'CSV dosyası ayrıştırılamadı',
        ],
      };
    }

    if (words.length === 0) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ['CSV dosyasında geçerli kelime bulunamadı'],
      };
    }

    return this.importWords(words);
  }

  async importFromPDF(): Promise<ImportResult> {
    let uri: string | null;
    try {
      uri = await this.pickPDFFile();
    } catch (error) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [
          error instanceof Error ? error.message : 'Dosya seçimi başarısız oldu',
        ],
      };
    }

    if (!uri) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Dosya seçilmedi'],
      };
    }

    let words: ParsedWord[];
    try {
      words = await this.parsePDF(uri);
    } catch (error) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: [
          error instanceof Error
            ? error.message
            : 'PDF dosyası ayrıştırılamadı',
        ],
      };
    }

    if (words.length === 0) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ['PDF dosyasında geçerli kelime bulunamadı. PDF dosyasının tire, iki nokta veya virgülle ayrılmış kelime-anlam çiftleri içerdiğinden emin olun.']
      };
    }

    return this.importWords(words);
  }

  async loadLocalPackage(fileAsset: unknown, packageName: string): Promise<PackageLoadResult> {
    try {
      if (!packageName.trim()) {
        throw new Error('Paket adı geçersiz.');
      }

      const database = await getDatabase();

      if (await isPackageInstalled(database, packageName)) {
        const message = `"${packageName}" paketi zaten yüklü.`;
        Alert.alert('Paket yüklenemedi', message);
        return {
          success: false,
          imported: 0,
          skipped: 0,
          error: message,
        };
      }

      const words = this.parseLocalPackageAsset(fileAsset);

      if (words.length === 0) {
        throw new Error('Paket dosyasında geçerli kelime bulunamadı.');
      }

      const wordService = createWordService(database);

      if (await wordService.isPackageLoaded(packageName)) {
        await markPackageInstalled(database, packageName);
        const message = `"${packageName}" paketi zaten yüklü.`;
        Alert.alert('Paket yüklenemedi', message);
        return {
          success: false,
          imported: 0,
          skipped: 0,
          error: message,
        };
      }

      const { imported, skipped } = await wordService.loadPackageWords(words, packageName);
      await markPackageInstalled(database, packageName);

      return {
        success: true,
        imported,
        skipped,
      };
    } catch (error) {
      console.error('[ImportService] loadLocalPackage failed:', error);

      const message =
        error instanceof PackageAlreadyLoadedError
          ? error.message
          : 'Paket yüklenirken teknik bir hata oluştu';

      Alert.alert('Paket yüklenemedi', message);

      return {
        success: false,
        imported: 0,
        skipped: 0,
        error: message,
      };
    }
  }

  private parseLocalPackageAsset(fileAsset: unknown): LocalPackageWord[] {
    let data: unknown = fileAsset;

    if (
      fileAsset &&
      typeof fileAsset === 'object' &&
      'default' in fileAsset &&
      (fileAsset as { default: unknown }).default !== undefined
    ) {
      data = (fileAsset as { default: unknown }).default;
    }

    if (!Array.isArray(data)) {
      throw new Error('Paket dosyası geçerli bir JSON dizisi değil.');
    }

    const words: LocalPackageWord[] = [];

    for (const item of data) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const record = item as Record<string, unknown>;
      const word = record.word;
      const meaning = record.meaning;
      const example = record.example;

      if (typeof word !== 'string' || typeof meaning !== 'string') {
        continue;
      }

      words.push({
        word,
        meaning,
        example: typeof example === 'string' ? example : undefined,
      });
    }

    return words;
  }
}

let importServiceInstance: ImportService | null = null;

export function getImportService(): ImportService {
  if (!importServiceInstance) {
    importServiceInstance = new ImportService();
  }
  return importServiceInstance;
}