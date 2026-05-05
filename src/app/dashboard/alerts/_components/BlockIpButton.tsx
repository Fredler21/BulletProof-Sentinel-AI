"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BlockIpButton({ ip }: { ip: string }): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);

  async function onClick(): Promise<void> {
    setBusy(true);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ip,
          reason: "Manual block from alert detail",
          ttlHours: 24,
        }),
      });
      if (res.ok) {
        setDone(true);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={busy || done}
      className="rounded-md border border-sentinel-danger/50 bg-sentinel-danger/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-sentinel-danger hover:bg-sentinel-danger/20 disabled:opacity-60"
    >
      {done ? "Blocked" : busy ? "…" : "Block IP"}
    </button>
  );
}
