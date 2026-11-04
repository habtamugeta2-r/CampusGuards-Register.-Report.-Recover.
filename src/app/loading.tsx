/**
 * Root navigation skeleton. Every console page is server-rendered from the
 * database (force-dynamic), so without this file a navigation showed nothing
 * until the query finished. The skeleton mirrors the common page shape:
 * header row, stat cards, content card. It is a valid standalone page (main
 * landmark + heading) because it is the first thing streamed to the browser.
 * Motion is disabled by the global prefers-reduced-motion rule.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10" aria-busy="true">
      <h1 className="sr-only">Loading…</h1>
      <div className="animate-pulse">
        <div className="h-3 w-24 rounded-full bg-slate-200" />
        <div className="mt-3 h-7 w-64 max-w-full rounded-lg bg-slate-200" />
        <div className="mt-2.5 h-4 w-96 max-w-full rounded-md bg-slate-100" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card card-pad">
              <div className="h-3.5 w-24 rounded-full bg-slate-100" />
              <div className="mt-3 h-8 w-16 rounded-lg bg-slate-200" />
              <div className="mt-3 h-3 w-32 max-w-full rounded-full bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-3">
          <div className="card card-pad xl:col-span-2">
            <div className="h-4 w-40 rounded-md bg-slate-200" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100" />
                  <div className="flex-1">
                    <div className="h-3.5 w-48 max-w-full rounded-md bg-slate-200" />
                    <div className="mt-2 h-3 w-32 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad">
            <div className="h-4 w-28 rounded-md bg-slate-200" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i}>
                  <div className="h-3.5 w-40 max-w-full rounded-md bg-slate-200" />
                  <div className="mt-2 h-3 w-full rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
