"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteProjectButton({
  id,
  name,
}: {
  id: string;
  name: string;
}): React.ReactElement {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(): Promise<void> {
    if (
      !confirm(
        `Delete project "${name}"? Its API key and hosted trap URL will stop working immediately.`,
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded border border-red-500/40 px-3 py-1 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
