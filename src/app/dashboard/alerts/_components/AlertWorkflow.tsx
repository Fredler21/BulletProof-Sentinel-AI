"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AlertItem, AlertStatus } from "@/lib/types";

const STATUS_OPTIONS: AlertStatus[] = ["open", "investigating", "resolved"];

export function AlertWorkflow({
  alert,
}: {
  alert: AlertItem;
}): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const status: AlertStatus = alert.status ?? "open";

  async function patch(body: object): Promise<void> {
    await fetch(`/api/alerts/${alert.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sentinel-border bg-sentinel-panel p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-sentinel-muted">
          Status
        </span>
        <div className="flex overflow-hidden rounded-md border border-sentinel-border">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={async () => {
                setBusy(`status-${s}`);
                try {
                  await patch({ status: s });
                } finally {
                  setBusy(null);
                }
              }}
              disabled={busy !== null}
              className={
                "px-3 py-1.5 text-xs " +
                (status === s
                  ? "bg-sentinel-accent text-slate-900"
                  : "bg-sentinel-bg text-slate-300 hover:bg-sentinel-panel")
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-sentinel-muted">
          Assignee
        </span>
        {alert.assigneeUid ? (
          <>
            <span className="rounded-md bg-sentinel-bg px-2 py-1 text-xs text-slate-200">
              {alert.assigneeName ?? alert.assigneeUid}
            </span>
            <button
              onClick={async () => {
                setBusy("unassign");
                try {
                  await patch({ unassign: true });
                } finally {
                  setBusy(null);
                }
              }}
              disabled={busy !== null}
              className="text-[11px] text-sentinel-muted hover:text-slate-200"
            >
              unassign
            </button>
          </>
        ) : (
          <button
            onClick={async () => {
              setBusy("assign");
              try {
                await patch({ assignToMe: true });
              } finally {
                setBusy(null);
              }
            }}
            disabled={busy !== null}
            className="rounded-md border border-sentinel-border px-3 py-1.5 text-xs text-slate-200 hover:bg-sentinel-bg"
          >
            Assign to me
          </button>
        )}
      </div>

      {!alert.acknowledged && (
        <button
          onClick={async () => {
            setBusy("ack");
            try {
              await patch({ acknowledge: true });
            } finally {
              setBusy(null);
            }
          }}
          disabled={busy !== null}
          className="ml-auto rounded-md bg-sentinel-ok/20 px-3 py-1.5 text-xs text-sentinel-ok hover:bg-sentinel-ok/30"
        >
          {busy === "ack" ? "…" : "Acknowledge"}
        </button>
      )}
    </div>
  );
}
