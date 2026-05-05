import { requireSessionUser } from "@/lib/server/session";
import { listRecentEvents } from "@/lib/server/events";
import { correlateRecentIncidents } from "@/lib/server/correlation";
import { generatePostureBrief } from "@/lib/server/posture";
import { adminDb } from "@/lib/firebase/admin";
import type { ScanResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const PRIORITY_STYLE: Record<string, string> = {
  critical: "border-sentinel-danger/50 bg-sentinel-danger/10 text-sentinel-danger",
  high: "border-sentinel-warn/50 bg-sentinel-warn/10 text-sentinel-warn",
  medium: "border-sentinel-accent/40 bg-sentinel-accent/10 text-sentinel-accent",
  low: "border-sentinel-border bg-sentinel-bg text-slate-300",
};

const LIKELIHOOD_STYLE: Record<string, string> = {
  high: "text-sentinel-danger",
  medium: "text-sentinel-warn",
  low: "text-sentinel-ok",
};

export default async function PosturePage(): Promise<React.ReactElement> {
  await requireSessionUser();
  const [events, scansSnap, incidents] = await Promise.all([
    listRecentEvents(200),
    adminDb.collection("scans").orderBy("createdAt", "desc").limit(30).get(),
    correlateRecentIncidents(500, 25),
  ]);
  const scans = scansSnap.docs.map((d) => d.data() as ScanResult);
  const brief = await generatePostureBrief({ events, scans, incidents });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Security Posture Brief
        </h1>
        <p className="text-sm text-sentinel-muted">
          AI-generated executive view of current risks, predictions, and
          autonomous recommendations. Model: <code>{brief.model}</code>
        </p>
      </div>

      <section className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sentinel-muted">
          Overall Posture
        </h2>
        <p className="mt-2 text-slate-100">{brief.summary}</p>
        <ul className="mt-4 space-y-1 text-sm text-slate-300">
          {brief.topRisks.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sentinel-muted">
          Autonomous Recommendations
        </h2>
        <ul className="mt-3 space-y-3">
          {brief.recommendations.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-sentinel-border/60 bg-sentinel-bg p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${PRIORITY_STYLE[r.priority] ?? PRIORITY_STYLE.medium}`}
                >
                  {r.priority}
                </span>
                <span className="rounded bg-sentinel-panel px-2 py-0.5 text-[10px] text-slate-300">
                  {r.category}
                </span>
                <p className="text-sm font-medium text-white">{r.title}</p>
              </div>
              <p className="mt-1 text-sm text-slate-300">{r.rationale}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-sentinel-muted">
          Predictive Threat Intelligence
        </h2>
        <ul className="mt-3 space-y-3">
          {brief.predictions.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-sentinel-border/60 bg-sentinel-bg p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-white">{p.title}</p>
                <span
                  className={`text-[10px] uppercase tracking-wide ${LIKELIHOOD_STYLE[p.likelihood] ?? LIKELIHOOD_STYLE.medium}`}
                >
                  {p.likelihood} likelihood
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{p.reasoning}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-sentinel-muted">
        Generated {new Date(brief.generatedAt).toLocaleString()}.
      </p>
    </div>
  );
}
