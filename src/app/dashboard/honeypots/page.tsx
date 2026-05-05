import { listTraps } from "@/lib/server/honeypots";

export const dynamic = "force-dynamic";


export default async function HoneypotsPage(): Promise<React.ReactElement> {
  const traps = await listTraps();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Honeypots</h1>
        <p className="text-sm text-sentinel-muted">
          Deployed decoys monitoring suspicious access patterns.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {traps.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">{t.name}</h2>
              <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-muted">
                {t.kind}
              </span>
            </div>
            <p className="mt-2 text-xs text-sentinel-muted">{t.description}</p>
            <p className="mt-3 font-mono text-xs text-sentinel-accent">
              {t.path}
            </p>
            <p className="mt-4 text-2xl font-semibold text-white">
              {t.hits}{" "}
              <span className="text-xs font-normal text-sentinel-muted">
                hits
              </span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
