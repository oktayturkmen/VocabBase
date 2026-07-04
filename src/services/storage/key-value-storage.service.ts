type KeyValueStorageConfig = {
  id?: string;
};

export type KeyValueStorage = {
  isPersistent: boolean;
  getString: (key: string) => string | undefined;
  set: (key: string, value: string | number | boolean) => void;
  remove: (key: string) => void;
};

type NativeMMKVModule = {
  createMMKV: (configuration?: KeyValueStorageConfig) => {
    getString: (key: string) => string | undefined;
    set: (key: string, value: string | number | boolean) => void;
    remove: (key: string) => boolean;
  };
};

const memoryStores = new Map<string, Map<string, string>>();
const storageInstances = new Map<string, KeyValueStorage>();

function createMemoryStorage(id: string): KeyValueStorage {
  const store = memoryStores.get(id) ?? new Map<string, string>();
  memoryStores.set(id, store);

  return {
    isPersistent: false,
    getString: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, String(value));
    },
    remove: (key) => {
      store.delete(key);
    },
  };
}

function createNativeStorage(id: string): KeyValueStorage | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkvModule = require('react-native-mmkv') as NativeMMKVModule;
    const storage = mmkvModule.createMMKV({ id });

    return {
      isPersistent: true,
      getString: (key) => storage.getString(key),
      set: (key, value) => storage.set(key, value),
      remove: (key) => storage.remove(key),
    };
  } catch {
    return null;
  }
}

export function getKeyValueStorage(config: KeyValueStorageConfig = {}): KeyValueStorage {
  const id = config.id ?? 'default';
  const existingStorage = storageInstances.get(id);

  if (existingStorage) {
    return existingStorage;
  }

  const storage = createNativeStorage(id) ?? createMemoryStorage(id);
  storageInstances.set(id, storage);

  return storage;
}
