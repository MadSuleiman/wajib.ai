"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "wajib:daily-highlight-enabled";
const STORAGE_EVENT = "wajib:daily-highlight-enabled";

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  const handler = (event: StorageEvent | Event) => {
    if (event instanceof StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
    }
    callback();
  };

  window.addEventListener("storage", handler);
  window.addEventListener(STORAGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORAGE_EVENT, handler);
  };
};

const getSnapshot = () => {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored !== "false";
};

const getServerSnapshot = () => true;

export function useDailyHighlightPreference() {
  const isEnabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setIsEnabled = useCallback((nextValue: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, nextValue ? "true" : "false");
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, []);

  return { isEnabled, setIsEnabled };
}
