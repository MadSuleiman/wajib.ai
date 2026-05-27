"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ComponentProps } from "react";
import type GrainientComponent from "@/components/Grainient";

type GrainientProps = ComponentProps<typeof GrainientComponent>;

const Grainient = dynamic(() => import("@/components/Grainient"), {
  ssr: false,
  loading: () => null,
});

export function DeferredGrainient(props: GrainientProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const browserWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (
          callback: IdleRequestCallback,
          options?: IdleRequestOptions,
        ) => number;
        cancelIdleCallback?: (handle: number) => void;
      };
    let timeoutId: number | undefined;
    let idleId: number | undefined;

    const render = () => setShouldRender(true);

    if (browserWindow.requestIdleCallback) {
      idleId = browserWindow.requestIdleCallback(render, { timeout: 1200 });
    } else {
      timeoutId = browserWindow.setTimeout(render, 250);
    }

    return () => {
      if (typeof idleId === "number" && browserWindow.cancelIdleCallback) {
        browserWindow.cancelIdleCallback(idleId);
      }
      if (typeof timeoutId === "number") {
        browserWindow.clearTimeout(timeoutId);
      }
    };
  }, []);

  return shouldRender ? <Grainient {...props} /> : null;
}
