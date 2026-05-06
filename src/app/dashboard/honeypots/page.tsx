import Link from "next/link";
import { listTraps } from "@/lib/server/honeypots";

export const dynamic = "force-dynamic";


export default async function HoneypotsPage(): Promise<React.ReactElement> {
  const traps = await listTraps();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Honeypots</h1>
        <p className="text-sm text-sentinel-muted">
          Deployed decoys monitoring suspicious access patterns. Click a card
          to see the IPs that triggered it and block them.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {traps.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/honeypots/${t.id}`}
            className="group rounded-xl border border-sentinel-border bg-sentinel-panel p-5 transition hover:border-sentinel-accent hover:bg-sentinel-panel/70"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white group-hover:text-sentinel-accent">
                {t.name}
              </h2>
              <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-muted">
                {t.kind}
              </span>
            </div>
            <p className="mt-2 text-xs text-sentinel-muted">{t.description}</p>
            <p className="mt-3 font-mono text-xs text-sentinel-accent">
              {t.path}
            </p>
            <div className="mt-4 flex items-end justify-between">
              <p className="text-2xl font-semibold text-white">
                {t.hits}{" "}
                <span className="text-xs font-normal text-sentinel-muted">
                  hits
                </span>
              </p>
              <span className="text-[10px] uppercase tracking-wide text-sentinel-muted group-hover:text-sentinel-accent">
                View attackers →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
