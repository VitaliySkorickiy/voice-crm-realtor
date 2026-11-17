import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
};

const StoreContext = createContext<StoreValue | null>(null);

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const initialized = await isInitialized();
      const saved = await loadDB();

      if (cancelled) return;

      if (initialized && saved) {
        // Уже работали с приложением — только сохранённые данные, без seed
        setClients(saved.clients);
        setProperties(saved.properties);
        setTasks(saved.tasks);
      } else if (!initialized) {
        // Первый запуск — демо-данные один раз
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

  // Сохраняем после гидрации при любых изменениях
  useEffect(() => {
    if (!hydrated) return;
    saveDB({ clients, properties, tasks });
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
  const deleteProperty = useCallback((id: string) => setProperties((p) => p.filter((pr) => pr.id !== id)), []);

  const updateTask = useCallback(
    (id: string, updated: any) => setTasks((p) => p.map((t) => (t.id === id ? { ...t, ...updated } : t))),
    []
  );
  const deleteTask = useCallback((id: string) => setTasks((p) => p.filter((t) => t.id !== id)), []);
  const addTask = useCallback((task: any) => setTasks((p) => [...p, task]), []);

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
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
