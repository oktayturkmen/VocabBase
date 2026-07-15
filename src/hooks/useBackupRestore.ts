import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';

import { useDatabase } from '@/database/useDatabase';
import { createBackup, restoreBackup } from '@/services/backup';
import { BackupDataSchema } from '@/types/backup';

export function useBackupRestore() {
  const database = useDatabase();

  const exportBackup = async () => {
    if (!database) {
      throw new Error('Database not available');
    }

    const backupData = await createBackup(database);
    const jsonString = JSON.stringify(backupData, null, 2);
    const fileName = `vocabbase-backup-${Date.now()}.json`;

    // Modern expo-file-system API: File sınıfı ile yazma
    const file = new File(Paths.document, fileName);
    file.write(jsonString);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Yedek Dosyasını Kaydet',
      });
    } else {
      throw new Error('Sharing not available on this platform');
    }

    // Paylaşım tamamlandıktan sonra geçici dosyayı temizle
    if (file.exists) {
      file.delete();
    }
  };

  const importBackup = async () => {
    if (!database) {
      throw new Error('Database not available');
    }

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      throw new Error('No file selected');
    }

    // Modern expo-file-system API: File sınıfı ile okuma
    const file = new File(result.assets[0].uri);
    const fileContent = await file.text();

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(fileContent);
    } catch {
      throw new Error('Seçilen dosya geçerli bir yedekleme dosyası (JSON) değil.');
    }
    const validatedData = BackupDataSchema.parse(parsedData);

    await restoreBackup(database, validatedData);
  };

  return {
    exportBackup,
    importBackup,
  };
}