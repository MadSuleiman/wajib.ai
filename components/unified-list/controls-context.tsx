"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type UnifiedListControlsContextValue = {
  isCreateTaskOpen: boolean;
  setIsCreateTaskOpen: (open: boolean) => void;
  isCreateRoutineOpen: boolean;
  setIsCreateRoutineOpen: (open: boolean) => void;
};

const UnifiedListControlsContext =
  createContext<UnifiedListControlsContextValue | null>(null);

export function UnifiedListControlsProvider({
  children,
}: {
  children: ReactNode;
}) {
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
    <UnifiedListControlsContext.Provider value={value}>
      {children}
    </UnifiedListControlsContext.Provider>
  );
}

export function useUnifiedListControls() {
  const context = useContext(UnifiedListControlsContext);
  if (!context) {
    throw new Error(
      "useUnifiedListControls must be used within a UnifiedListControlsProvider",
    );
  }
  return context;
}
