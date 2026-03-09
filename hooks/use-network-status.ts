"use client";

import { useEffect, useState } from "react";

type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
};

const getConnection = (): NetworkConnection | null => {
  if (typeof navigator === "undefined") return null;

  return (
    (
      navigator as Navigator & {
        connection?: NetworkConnection;
        mozConnection?: NetworkConnection;
        webkitConnection?: NetworkConnection;
      }
    ).connection ??
    (navigator as Navigator & { mozConnection?: NetworkConnection })
      .mozConnection ??
    (navigator as Navigator & { webkitConnection?: NetworkConnection })
      .webkitConnection ??
    null
  );
};

const getSnapshot = () => {
  const connection = getConnection();
  const effectiveType = connection?.effectiveType ?? null;
  const saveData = connection?.saveData ?? false;
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine;
  const isSlowConnection =
    isOnline &&
    (saveData ||
      effectiveType === "slow-2g" ||
      effectiveType === "2g" ||
      effectiveType === "3g");

  return {
    isOnline,
    effectiveType,
    saveData,
    isSlowConnection,
  };
};

export function useNetworkStatus() {
  const [status, setStatus] = useState(() => ({
    ...getSnapshot(),
    isCheckingConnection: true,
  }));

  useEffect(() => {
    const handleUpdate = () =>
      setStatus({
        ...getSnapshot(),
        isCheckingConnection: false,
      });

    handleUpdate();

    window.addEventListener("online", handleUpdate);
    window.addEventListener("offline", handleUpdate);

    const connection = getConnection();
    connection?.addEventListener?.("change", handleUpdate);

    return () => {
      window.removeEventListener("online", handleUpdate);
      window.removeEventListener("offline", handleUpdate);
      connection?.removeEventListener?.("change", handleUpdate);
    };
  }, []);

  return status;
}
