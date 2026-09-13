import { BrandLogo } from "@/components/brand/brand-logo";

type DashboardLoadingProps = {
  withNavigation?: boolean;
};

const loadingRows = Array.from({ length: 5 }, (_, index) => index);

export function DashboardLoadingContent() {
  return (
    <div className="dashboard-width py-7 md:py-10" aria-busy="true">
      <div className="mx-auto max-w-full space-y-6">
        <div className="rounded-lg border bg-card/50 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-2 w-44 animate-pulse rounded bg-muted/70" />
            </div>
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="space-y-3">
            {loadingRows.map((row) => (
              <div
                key={row}
                className="rounded-2xl border bg-card/50 p-4 shadow-sm backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-2/5 animate-pulse rounded bg-muted/70" />
                    <div className="flex gap-2">
                      <div className="h-5 w-16 animate-pulse rounded-full bg-muted/80" />
                      <div className="h-5 w-20 animate-pulse rounded-full bg-muted/80" />
                    </div>
                  </div>
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function DashboardLoading({
  withNavigation = true,
}: DashboardLoadingProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {withNavigation ? (
        <header className="dashboard-header">
          <div className="dashboard-width flex h-20 items-center justify-between">
            <BrandLogo />
            <div className="flex items-center gap-2">
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted/80" />
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted/80" />
            </div>
          </div>
        </header>
      ) : null}
      <main className="pb-[env(safe-area-inset-bottom)]">
        <DashboardLoadingContent />
      </main>
    </div>
  );
}
