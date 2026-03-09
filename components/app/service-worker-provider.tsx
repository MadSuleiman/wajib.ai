"use client";

import { useEffect } from "react";

const shouldRegisterServiceWorker = () => {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  return process.env.NODE_ENV === "production";
};

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (!shouldRegisterServiceWorker()) return;

    let isRefreshing = false;

    const handleControllerChange = () => {
      if (isRefreshing) return;
      isRefreshing = true;
      window.location.reload();
    };

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        const promptWaitingWorker = () => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        };

        if (registration.waiting) {
          promptWaitingWorker();
        }

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (
              installingWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promptWaitingWorker();
            }
          });
        });

        const handleVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            void registration.update();
          }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
          document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
          );
        };
      } catch (error) {
        console.error("Service worker registration failed", error);
        return undefined;
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    let cleanupRegistration: (() => void) | undefined;

    void registerServiceWorker().then((cleanup) => {
      cleanupRegistration = cleanup;
    });

    return () => {
      cleanupRegistration?.();
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  return null;
}
