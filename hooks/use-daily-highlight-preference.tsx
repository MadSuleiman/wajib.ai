"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { createClientSupabaseClient } from "@/lib/supabase-client";

type DailyHighlightPreferenceContextValue = {
  isEnabled: boolean;
  isSaving: boolean;
  setIsEnabled: (nextValue: boolean) => void;
};

const DailyHighlightPreferenceContext =
  createContext<DailyHighlightPreferenceContextValue | null>(null);

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

export function DailyHighlightPreferenceProvider({
  userId,
  initialEnabled,
  children,
}: {
  userId: string;
  initialEnabled: boolean;
  children: ReactNode;
}) {
  const supabase = useMemo(() => createClientSupabaseClient(), []);
  const [isEnabled, setIsEnabledState] = useState(initialEnabled);
  const [isSaving, setIsSaving] = useState(false);

  const setIsEnabled = useCallback(
    (nextValue: boolean) => {
      if (isSaving || nextValue === isEnabled) return;

      const previousValue = isEnabled;
      setIsEnabledState(nextValue);
      setIsSaving(true);

      void (async () => {
        try {
          const { error } = await supabase.from("user_preferences").upsert(
            {
              user_id: userId,
              daily_highlight_enabled: nextValue,
            } as never,
            { onConflict: "user_id" },
          );

          if (error) {
            setIsEnabledState(previousValue);
            toast.error("Couldn't save preference", {
              description:
                getErrorMessage(error) ||
                "Reconnect and try updating this setting again.",
            });
          }
        } finally {
          setIsSaving(false);
        }
      })();
    },
    [isEnabled, isSaving, supabase, userId],
  );

  const value = useMemo(
    () => ({ isEnabled, isSaving, setIsEnabled }),
    [isEnabled, isSaving, setIsEnabled],
  );

  return (
    <DailyHighlightPreferenceContext.Provider value={value}>
      {children}
    </DailyHighlightPreferenceContext.Provider>
  );
}

export function useDailyHighlightPreference() {
  const context = useContext(DailyHighlightPreferenceContext);

  if (!context) {
    throw new Error(
      "useDailyHighlightPreference must be used within DailyHighlightPreferenceProvider",
    );
  }

  return context;
}
