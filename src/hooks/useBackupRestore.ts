import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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
    const fileUri = `${(FileSystem as any).documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Yedek Dosyasını Kaydet',
      });
    } else {
      throw new Error('Sharing not available on this platform');
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

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsedData = JSON.parse(fileContent);
    const validatedData = BackupDataSchema.parse(parsedData);

    await restoreBackup(database, validatedData);
  };

  return {
    exportBackup,
    importBackup,
  };
}
