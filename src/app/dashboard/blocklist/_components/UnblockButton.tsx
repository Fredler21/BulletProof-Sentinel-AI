"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UnblockButton({ ip }: { ip: string }): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState<boolean>(false);

  async function onClick(): Promise<void> {
    setBusy(true);
    try {
      await fetch(`/api/blocklist/${encodeURIComponent(ip)}`, {
        method: "DELETE",
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-md border border-sentinel-border px-3 py-1 text-xs text-slate-200 hover:bg-sentinel-bg disabled:opacity-60"
    >
      {busy ? "…" : "Unblock"}
    </button>
  );
}
