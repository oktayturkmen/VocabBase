import { useMutation } from '@tanstack/react-query';

import { getImportService, type ImportResult } from '@/services/import';

type ImportType = 'csv' | 'pdf';

export function useImportWords() {
  return useMutation<ImportResult, Error, ImportType>({
    mutationFn: async (type: ImportType) => {
      const importService = getImportService();
      return type === 'csv' ? importService.importFromCSV() : importService.importFromPDF();
    },
  });
}