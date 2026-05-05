"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcknowledgeButton({
  id,
}: {
  id: string;
}): React.ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  async function onClick(): Promise<void> {
    setLoading(true);
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-md border border-sentinel-border px-3 py-1.5 text-xs text-slate-200 hover:bg-sentinel-bg disabled:opacity-60"
    >
      {loading ? "…" : "Acknowledge"}
    </button>
  );
}
