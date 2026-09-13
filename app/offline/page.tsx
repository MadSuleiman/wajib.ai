import Link from "next/link";
import { BrandLockup } from "@/components/brand/brand-logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 text-center">
        <BrandLockup className="mx-auto mb-8 w-44" />
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Offline
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          A moment to reconnect
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Your cached pages are still here. Reconnect to refresh your tasks and
          routines.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Back to my day
        </Link>
      </div>
    </main>
  );
}
