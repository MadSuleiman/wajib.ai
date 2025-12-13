"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CreationDialogsContextValue = {
  isCreateTaskOpen: boolean;
  setIsCreateTaskOpen: (open: boolean) => void;
  isCreateRoutineOpen: boolean;
  setIsCreateRoutineOpen: (open: boolean) => void;
};

const CreationDialogsContext =
  createContext<CreationDialogsContextValue | null>(null);

export function CreationDialogsProvider({ children }: { children: ReactNode }) {
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateRoutineOpen, setIsCreateRoutineOpen] = useState(false);

  const value = useMemo(
    () => ({
      isCreateTaskOpen,
      setIsCreateTaskOpen,
      isCreateRoutineOpen,
      setIsCreateRoutineOpen,
    }),
    [isCreateTaskOpen, isCreateRoutineOpen],
  );

  return (
    <CreationDialogsContext.Provider value={value}>
      {children}
    </CreationDialogsContext.Provider>
  );
}

export function useCreationDialogs() {
  const context = useContext(CreationDialogsContext);
  if (!context) {
    throw new Error(
      "useCreationDialogs must be used within a CreationDialogsProvider",
    );
  }
  return context;
}
