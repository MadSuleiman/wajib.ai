"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(
  () => import("@/components/ui/sonner").then((mod) => mod.Toaster),
  {
    ssr: false,
    loading: () => null,
  },
);

export function DeferredToaster() {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShouldRender(true), 250);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return shouldRender ? <Toaster /> : null;
}
