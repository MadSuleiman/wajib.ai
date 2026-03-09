"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const isStandaloneDisplayMode = () => {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
};

const getPlatformState = () => {
  if (typeof navigator === "undefined") {
    return {
      isIos: false,
      isAndroid: false,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();
  return {
    isIos: /iphone|ipad|ipod/.test(userAgent),
    isAndroid: /android/.test(userAgent),
  };
};

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode);
  const { isIos, isAndroid } = useMemo(() => getPlatformState(), []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => {
      setIsInstalled(isStandaloneDisplayMode());
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleDisplayModeChange);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleDisplayModeChange);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const promptToInstall = useCallback(async () => {
    if (!promptEvent) return false;

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      setIsInstalled(true);
      return true;
    }

    return false;
  }, [promptEvent]);

  return {
    isInstalled,
    canPromptInstall: Boolean(promptEvent),
    promptToInstall,
    isIos,
    isAndroid,
  };
}
