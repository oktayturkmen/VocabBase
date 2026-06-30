import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { extractText, isAvailable } from 'expo-pdf-text-extract';

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

export class ImportService {
  async pickCSVFile(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Failed to pick CSV file:', error);
      return null;
    }
  }

  async pickPDFFile(): Promise<string | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('Failed to pick PDF file:', error);
      return null;
    }
  }

  async parseCSV(uri: string): Promise<ParsedWord[]> {
    try {
      const content = await FileSystem.readAsStringAsync(uri);
      const lines = content.split('\n').filter((line) => line.trim());

      const words: ParsedWord[] = [];

      for (const line of lines) {
        // Skip header if it contains "word" or "meaning"
        if (line.toLowerCase().includes('word') && line.toLowerCase().includes('meaning')) {
          continue;
        }

        // Parse CSV line (handle quoted values)
        const parts = this.parseCSVLine(line);

        if (parts.length >= 2) {
          words.push({
            word: parts[0].trim(),
            meaning: parts[1].trim(),
            example: parts[2]?.trim(),
            pronunciation: parts[3]?.trim(),
          });
        }
      }

      return words;
    } catch (error) {
      console.error('Failed to parse CSV:', error);
      return [];
    }
  }

  private parseCSVLine(line: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    parts.push(current);
    return parts;
  }

  async parsePDF(uri: string): Promise<ParsedWord[]> {
    // Check if PDF extraction is available
    if (!isAvailable()) {
      console.warn('PDF extraction is not available. Requires a development build.');
      return [];
    }

    try {
      // Extract text from PDF
      const text = await extractText(uri);

      if (!text || text.trim().length === 0) {
        console.warn('No text found in PDF');
        return [];
      }

      // Parse the extracted text to find word-meaning pairs
      return this.parseTextToWords(text);
    } catch (error) {
      console.error('Failed to parse PDF:', error);
      return [];
    }
  }

  private parseTextToWords(text: string): ParsedWord[] {
    const words: ParsedWord[] = [];
    const lines = text.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      // Skip header lines
      if (line.toLowerCase().includes('word') && line.toLowerCase().includes('meaning')) {
        continue;
      }

      // Try different separators: -, :, =, or tab
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

      // If no separator found, try comma (common in CSV-like PDFs)
      if (!parsed && line.includes(',')) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          parsed = {
            word: parts[0].trim(),
            meaning: parts[1].trim(),
          };
        }
      }

      // If still no separator, try space (first word is the word, rest is meaning)
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
    const uri = await this.pickCSVFile();
    if (!uri) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Dosya seçilmedi'],
      };
    }

    const words = await this.parseCSV(uri);
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
    const uri = await this.pickPDFFile();
    if (!uri) {
      return {
        success: false,
        imported: 0,
        failed: 0,
        errors: ['Dosya seçilmedi'],
      };
    }

    const words = await this.parsePDF(uri);
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
