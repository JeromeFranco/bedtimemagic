import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SelectedChildContextValue {
  selectedChildId: string | null;
  setSelectedChildId: (id: string | null) => void;
}

const SelectedChildContext = createContext<SelectedChildContextValue>({
  selectedChildId: null,
  setSelectedChildId: () => {},
});

const STORAGE_KEY = 'selected_child_id';

export function SelectedChildProvider({ children }: { children: React.ReactNode }) {
  const [selectedChildId, setSelectedChildIdState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((id) => {
      setSelectedChildIdState(id);
      setLoaded(true);
    });
  }, []);

  const setSelectedChildId = (id: string | null) => {
    setSelectedChildIdState(id);
    if (id) {
      AsyncStorage.setItem(STORAGE_KEY, id);
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  if (!loaded) return null;

  return (
    <SelectedChildContext.Provider value={{ selectedChildId, setSelectedChildId }}>
      {children}
    </SelectedChildContext.Provider>
  );
}

export const useSelectedChild = () => useContext(SelectedChildContext);
