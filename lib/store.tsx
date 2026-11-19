import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ActivityIndicator, View, Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { SEED_CLIENTS, SEED_PROPERTIES, SEED_TASKS } from './seed';
import { loadDB, saveDB, isInitialized } from './storage';

type StoreValue = {
  clients: any[];
  properties: any[];
  tasks: any[];
  ready: boolean;
  addClient: (client: any) => void;
  updateClient: (id: string, updated: any) => void;
  deleteClient: (id: string) => void;
  addProperty: (property: any) => void;
  updateProperty: (id: string, updated: any) => void;
  deleteProperty: (id: string) => void;
  updateTask: (id: string, updated: any) => void;
  deleteTask: (id: string) => void;
  addTask: (task: any) => void;
  replaceAll: (data: { clients: any[]; properties: any[]; tasks: any[] }) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

async function deleteLocalPhotoFiles(uris: (string | null | undefined)[]) {
  if (Platform.OS === 'web') return;
  const base = FileSystem.documentDirectory;
  if (!base) return;
  const photosPrefix = base + 'photos/';
  for (const uri of uris) {
    if (!uri || typeof uri !== 'string') continue;
    if (!uri.startsWith(photosPrefix)) continue;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (e) {
      console.log('photo delete failed', uri, e);
    }
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const saveAlertShown = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initialized = await isInitialized();
      const saved = await loadDB();

      if (cancelled) return;

      if (initialized && saved) {
        setClients(saved.clients);
        setProperties(saved.properties);
        setTasks(saved.tasks);
      } else if (!initialized) {
        setClients(SEED_CLIENTS);
        setProperties(SEED_PROPERTIES);
        setTasks(SEED_TASKS);
      } else {
        setClients(saved?.clients ?? []);
        setProperties(saved?.properties ?? []);
        setTasks(saved?.tasks ?? []);
      }
      setHydrated(true);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    (async () => {
      try {
        await saveDB({ clients, properties, tasks });
        saveAlertShown.current = false;
      } catch (e: any) {
        console.log('DB save error:', e);
        if (!cancelled && !saveAlertShown.current) {
          saveAlertShown.current = true;
          Alert.alert(
            'Не удалось сохранить',
            e?.message || 'Ошибка записи базы на устройство. Проверьте свободное место и попробуйте снова.'
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clients, properties, tasks, hydrated]);

  const addClient = useCallback((client: any) => setClients((p) => [client, ...p]), []);
  const updateClient = useCallback(
    (id: string, updated: any) => setClients((p) => p.map((c) => (c.id === id ? { ...c, ...updated } : c))),
    []
  );
  const deleteClient = useCallback((id: string) => setClients((p) => p.filter((c) => c.id !== id)), []);

  const addProperty = useCallback((property: any) => setProperties((p) => [property, ...p]), []);
  const updateProperty = useCallback(
    (id: string, updated: any) => setProperties((p) => p.map((pr) => (pr.id === id ? { ...pr, ...updated } : pr))),
    []
  );
  const deleteProperty = useCallback((id: string) => {
    setProperties((prev) => {
      const target = prev.find((pr) => pr.id === id);
      if (target) {
        const uris = [
          ...(Array.isArray(target.photos) ? target.photos : []),
          target.photo,
        ];
        deleteLocalPhotoFiles(uris).catch(() => {});
      }
      return prev.filter((pr) => pr.id !== id);
    });
  }, []);

  const updateTask = useCallback(
    (id: string, updated: any) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...updated } : t))),
    []
  );
  const deleteTask = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);
  const addTask = useCallback((task: any) => setTasks((p) => [...p, task]), []);
  const replaceAll = useCallback((data: { clients: any[]; properties: any[]; tasks: any[] }) => {
    setClients(Array.isArray(data.clients) ? data.clients : []);
    setProperties(Array.isArray(data.properties) ? data.properties : []);
    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        clients,
        properties,
        tasks,
        ready,
        addClient,
        updateClient,
        deleteClient,
        addProperty,
        updateProperty,
        deleteProperty,
        updateTask,
        deleteTask,
        addTask,
        replaceAll,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
