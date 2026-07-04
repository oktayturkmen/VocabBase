import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { extractText, isAvailable } from 'expo-pdf-text-extract';
import { Platform } from 'react-native';

import { getWordService } from '../word';

export type ImportResult = {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
};

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
   */
  private async readFileContent(uri: string): Promise<string> {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      return response.text();
    }

    // Mobilde content:// veya file:// şemalarını güvenle okumak için
    // expo-file-system kullanılır.
    return FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
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
          words.push({
            word: row[0].trim(),
            meaning: row[1].trim(),
            example: row[2]?.trim(),
            pronunciation: row[3]?.trim(),
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

      if (parsed && parsed.word && parsed.meaning) {
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

    const wordService = await getWordService();

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
}

let importServiceInstance: ImportService | null = null;

export function getImportService(): ImportService {
  if (!importServiceInstance) {
    importServiceInstance = new ImportService();
  }
  return importServiceInstance;
}