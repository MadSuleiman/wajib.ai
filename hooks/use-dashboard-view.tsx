"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardView = "tasks" | "shopping" | "watch" | "settings";
export type DashboardListView = Exclude<DashboardView, "settings">;

interface DashboardViewContextValue {
  view: DashboardView;
  lastListView: DashboardListView;
  setView: (view: DashboardView) => void;
}

const DashboardViewContext = createContext<DashboardViewContextValue | null>(
  null,
);

export function DashboardViewProvider({
  initialView = "tasks",
  children,
}: {
  initialView?: DashboardView;
  children: ReactNode;
}) {
  const [view, setViewState] = useState<DashboardView>(initialView);
  const [lastListView, setLastListView] = useState<DashboardListView>(
    initialView === "settings" ? "tasks" : (initialView as DashboardListView),
  );

  const setView = useCallback((nextView: DashboardView) => {
    setViewState(nextView);

    if (nextView !== "settings") {
      setLastListView(nextView as DashboardListView);
    }
  }, []);

  const value = useMemo(
    () => ({
      view,
      lastListView,
      setView,
    }),
    [view, lastListView, setView],
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
