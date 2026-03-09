export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border bg-background/70 p-8 text-center shadow-lg backdrop-blur">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted-foreground">
          Offline
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Wajib needs a connection for fresh data
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          The app shell is available, but this page could not be refreshed.
          Reconnect to continue syncing tasks and routines.
        </p>
      </div>
    </main>
  );
}
