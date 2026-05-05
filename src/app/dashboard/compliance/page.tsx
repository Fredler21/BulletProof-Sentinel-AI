import { requireSessionUser } from "@/lib/server/session";
import { evaluateCompliance, summarizeFrameworks } from "@/lib/server/compliance";
import type { ComplianceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<ComplianceStatus, string> = {
  pass: "border-sentinel-ok/50 bg-sentinel-ok/10 text-sentinel-ok",
  warn: "border-sentinel-warn/50 bg-sentinel-warn/10 text-sentinel-warn",
  fail: "border-sentinel-danger/50 bg-sentinel-danger/10 text-sentinel-danger",
  manual: "border-sentinel-border bg-sentinel-bg text-slate-300",
};

export default async function CompliancePage(): Promise<React.ReactElement> {
  await requireSessionUser();
  const controls = await evaluateCompliance();
  const summaries = summarizeFrameworks(controls);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Compliance</h1>
        <p className="text-sm text-sentinel-muted">
          Live evaluation of platform controls against SOC 2, ISO 27001, HIPAA,
          and GDPR. <span className="text-slate-300">Manual</span> controls
          require evidence outside the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((s) => (
          <div
            key={s.framework}
            className="rounded-xl border border-sentinel-border bg-sentinel-panel p-4"
          >
            <p className="text-xs uppercase tracking-wide text-sentinel-muted">
              {s.framework}
            </p>
            <p className="mt-1 text-3xl font-semibold text-white">
              {s.scorePct}%
            </p>
            <p className="mt-1 text-xs text-sentinel-muted">
              {s.pass} pass · {s.warn} warn · {s.fail} fail · {s.manual} manual
            </p>
          </div>
        ))}
      </div>

      {summaries.map((s) => (
        <section
          key={s.framework}
          className="rounded-xl border border-sentinel-border bg-sentinel-panel"
        >
          <header className="border-b border-sentinel-border px-5 py-3">
            <h2 className="text-sm font-medium text-white">{s.framework}</h2>
          </header>
          <ul className="divide-y divide-sentinel-border/60">
            {controls
              .filter((c) => c.framework === s.framework)
              .map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_STYLE[c.status]}`}
                    >
                      {c.status}
                    </span>
                    <span className="font-mono text-xs text-sentinel-muted">
                      {c.code}
                    </span>
                    <p className="text-sm font-medium text-white">{c.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{c.description}</p>
                  <p className="mt-1 text-xs text-slate-300">
                    <span className="text-sentinel-muted">Evidence:</span>{" "}
                    {c.evidence}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
