import Link from "next/link";
import { listTraps } from "@/lib/server/honeypots";
import { listProjectsForUser } from "@/lib/server/projects";
import { requireSessionUser } from "@/lib/server/session";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";

export const dynamic = "force-dynamic";


export default async function HoneypotsPage(): Promise<React.ReactElement> {
  const user = await requireSessionUser();
  const [traps, projects] = await Promise.all([
    listTraps(),
    listProjectsForUser(user.uid),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Honeypots</h1>
        <p className="text-sm text-sentinel-muted">
          Deployed decoys monitoring suspicious access patterns. Click a card
          to see the IPs that triggered it and block them.
        </p>
      </div>

      {projects.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-sentinel-muted">
              Embedded Honeypot Projects
            </h2>
            <Link
              href="/dashboard/projects"
              className="text-xs text-sentinel-accent hover:underline"
            >
              Manage projects →
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.id}`}
                className="group rounded-xl border border-sentinel-border bg-sentinel-panel p-5 transition hover:border-sentinel-accent hover:bg-sentinel-panel/70"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white group-hover:text-sentinel-accent">
                    {p.name}
                  </h3>
                  <span className="rounded-full border border-sentinel-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-muted">
                    embedded
                  </span>
                </div>
                <p className="mt-2 text-xs text-sentinel-muted">
                  {p.domain ?? "no domain set"}
                </p>
                <p className="mt-3 font-mono text-xs text-sentinel-accent break-all">
                  /api/v1/trap/{p.id}
                </p>
                <div className="mt-4 flex items-end justify-between">
                  <p className="text-2xl font-semibold text-white">
                    {p.hits}{" "}
                    <span className="text-xs font-normal text-sentinel-muted">
                      hits
                    </span>
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-sentinel-muted group-hover:text-sentinel-accent">
                    {p.lastHitAt ? (
                      <>
                        last <TimeAgo timestamp={p.lastHitAt} /> →
                      </>
                    ) : (
                      "View attackers →"
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-sentinel-muted">
          Built-in Traps
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {traps.map((t) => (
            <Link
              key={t.id}
              href={`/dashboard/honeypots/${t.id}`}
              className="group rounded-xl border border-sentinel-border bg-sentinel-panel p-5 transition hover:border-sentinel-accent hover:bg-sentinel-panel/70"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white group-hover:text-sentinel-accent">
                  {t.name}
                </h3>
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
      </section>
    </div>
  );
}
