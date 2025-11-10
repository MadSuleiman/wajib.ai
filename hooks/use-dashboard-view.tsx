"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardView = "list" | "settings";

interface DashboardViewContextValue {
  view: DashboardView;
  setView: (view: DashboardView) => void;
}

const DashboardViewContext = createContext<DashboardViewContextValue | null>(
  null,
);

export function DashboardViewProvider({
  initialView = "list",
  children,
}: {
  initialView?: DashboardView;
  children: ReactNode;
}) {
  const [view, setViewState] = useState<DashboardView>(initialView);

  const setView = useCallback((nextView: DashboardView) => {
    setViewState(nextView);
  }, []);

  const value = useMemo(
    () => ({
      view,
      setView,
    }),
    [view, setView],
  );

  return (
    <DashboardViewContext.Provider value={value}>
      {children}
    </DashboardViewContext.Provider>
  );
}

export function useDashboardView() {
  const context = useContext(DashboardViewContext);
  if (!context) {
    throw new Error(
      "useDashboardView must be used within a DashboardViewProvider",
    );
  }
  return context;
}
