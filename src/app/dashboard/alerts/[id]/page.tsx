import { notFound } from "next/navigation";
import Link from "next/link";
import { getAlert } from "@/lib/server/collab";
import { listNotes } from "@/lib/server/collab";
import { requireSessionUser } from "@/lib/server/session";
import { adminDb } from "@/lib/firebase/admin";
import type { SecurityEvent } from "@/lib/types";
import { SeverityBadge } from "@/app/dashboard/_components/SeverityBadge";
import { TimeAgo } from "@/app/dashboard/_components/TimeAgo";
import { ExplainButton } from "@/app/dashboard/_components/ExplainButton";
import { AlertWorkflow } from "@/app/dashboard/alerts/_components/AlertWorkflow";
import { NotesThread } from "@/app/dashboard/alerts/_components/NotesThread";
import { BlockIpButton } from "@/app/dashboard/alerts/_components/BlockIpButton";

export const dynamic = "force-dynamic";

async function getEvent(id: string | null): Promise<SecurityEvent | null> {
  if (!id) return null;
  const snap = await adminDb.collection("security_events").doc(id).get();
  return (snap.data() as SecurityEvent | undefined) ?? null;
}

export default async function AlertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  await requireSessionUser();
  const { id } = await params;
  const alert = await getAlert(id);
  if (!alert) notFound();

  const [event, notes] = await Promise.all([
    getEvent(alert.eventId),
    listNotes(id),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/alerts"
        className="text-xs text-sentinel-accent hover:underline"
      >
        ← Back to alerts
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={alert.severity} />
          <span className="text-xs text-sentinel-muted">
            <TimeAgo timestamp={alert.createdAt} /> · {alert.source}
          </span>
          {alert.acknowledged && (
            <span className="rounded-full border border-sentinel-ok/40 bg-sentinel-ok/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-ok">
              Acknowledged
            </span>
          )}
        </div>
        <h1 className="text-2xl font-semibold text-white">{alert.title}</h1>
      </header>

      <AlertWorkflow alert={alert} />

      {event && (
        <section className="rounded-xl border border-sentinel-border bg-sentinel-panel p-5">
          <h2 className="text-sm font-medium uppercase tracking-wide text-sentinel-muted">
            Originating Event
          </h2>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
            <Detail label="Type" value={<code>{event.type}</code>} />
            <Detail label="Severity" value={<SeverityBadge severity={event.severity} />} />
            <Detail
              label="IP"
              value={
                event.ip ? (
                  <span className="flex items-center gap-2 font-mono text-xs">
                    {event.ip}
                    <BlockIpButton ip={event.ip} />
                  </span>
                ) : (
                  <span className="text-sentinel-muted">—</span>
                )
              }
            />
            <Detail
              label="Route"
              value={
                <span className="font-mono text-xs">{event.route ?? "—"}</span>
              }
            />
            <Detail
              label="User Agent"
              value={
                <span className="break-all text-xs text-sentinel-muted">
                  {event.userAgent ?? "—"}
                </span>
              }
            />
            <Detail
              label="Time"
              value={
                <span className="text-xs text-sentinel-muted">
                  {new Date(event.createdAt).toLocaleString()}
                </span>
              }
            />
          </dl>
          <div className="mt-4">
            <ExplainButton eventId={event.id} />
          </div>
        </section>
      )}

      <NotesThread alertId={id} initialNotes={notes} />
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3">
      <dt className="w-24 shrink-0 text-xs uppercase tracking-wide text-sentinel-muted">
        {label}
      </dt>
      <dd className="text-slate-200">{value}</dd>
    </div>
  );
}
