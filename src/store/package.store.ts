import { create } from 'zustand';

const DEFAULT_ACTIVE_PACKAGE = 'A1 Seviye';

interface PackageStore {
  activePackageName: string;
  setActivePackageName: (packageName: string) => void;
  resetActivePackageName: () => void;
}

export const usePackageStore = create<PackageStore>((set) => ({
  activePackageName: DEFAULT_ACTIVE_PACKAGE,
  setActivePackageName: (packageName) => set({ activePackageName: packageName }),
  resetActivePackageName: () => set({ activePackageName: DEFAULT_ACTIVE_PACKAGE }),
}));
