"use client";

import { useState } from "react";

export function BlockIpButton({
  ip,
  reason,
  initiallyBlocked,
}: {
  ip: string;
  reason: string;
  initiallyBlocked: boolean;
}): React.ReactElement {
  const [blocked, setBlocked] = useState(initiallyBlocked);
  const [busy, setBusy] = useState(false);

  async function block(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip, reason, ttlHours: null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBlocked(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Block failed");
    } finally {
      setBusy(false);
    }
  }

  async function unblock(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch(`/api/blocklist/${encodeURIComponent(ip)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setBlocked(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unblock failed");
    } finally {
      setBusy(false);
    }
  }

  if (blocked) {
    return (
      <button
        type="button"
        onClick={unblock}
        disabled={busy}
        className="rounded border border-emerald-500/40 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
      >
        {busy ? "…" : "Unblock"}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={block}
      disabled={busy}
      className="rounded border border-red-500/50 px-2 py-1 text-[11px] font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
    >
      {busy ? "…" : "Block IP"}
    </button>
  );
}
