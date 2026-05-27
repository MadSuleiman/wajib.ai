"use client";

import dynamic from "next/dynamic";

const ZoomPrevention = dynamic(
  () => import("@/components/app/anti-zoom").then((mod) => mod.ZoomPrevention),
  {
    ssr: false,
    loading: () => null,
  },
);
const ServiceWorkerProvider = dynamic(
  () =>
    import("@/components/app/service-worker-provider").then(
      (mod) => mod.ServiceWorkerProvider,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);
const DeferredToaster = dynamic(
  () =>
    import("@/components/app/deferred-toaster").then(
      (mod) => mod.DeferredToaster,
    ),
  {
    ssr: false,
    loading: () => null,
  },
);

export function ClientEffects() {
  return (
    <>
      <ZoomPrevention />
      <ServiceWorkerProvider />
      <DeferredToaster />
    </>
  );
}
