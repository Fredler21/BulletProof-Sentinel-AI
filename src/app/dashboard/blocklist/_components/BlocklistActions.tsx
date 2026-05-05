"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function BlocklistActions(): React.ReactElement {
  const router = useRouter();
  const [ip, setIp] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [ttlHours, setTtlHours] = useState<string>("24");
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ip: ip.trim(),
          reason: reason.trim(),
          ttlHours: ttlHours === "" ? null : Number(ttlHours),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to block");
      }
      setIp("");
      setReason("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 gap-3 rounded-xl border border-sentinel-border bg-sentinel-panel p-4 md:grid-cols-[1fr_2fr_auto_auto]"
    >
      <input
        required
        placeholder="IP (e.g. 203.0.113.5)"
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        className="rounded-md border border-sentinel-border bg-sentinel-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sentinel-accent"
      />
      <input
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="rounded-md border border-sentinel-border bg-sentinel-bg px-3 py-2 text-sm text-slate-100 outline-none focus:border-sentinel-accent"
      />
      <select
        value={ttlHours}
        onChange={(e) => setTtlHours(e.target.value)}
        className="rounded-md border border-sentinel-border bg-sentinel-bg px-2 py-2 text-xs text-slate-100"
      >
        <option value="1">1h</option>
        <option value="24">24h</option>
        <option value="168">7d</option>
        <option value="720">30d</option>
        <option value="">Permanent</option>
      </select>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-sentinel-danger px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
      >
        {busy ? "Blocking…" : "Block IP"}
      </button>
      {error && (
        <p className="md:col-span-4 rounded-md border border-sentinel-danger/40 bg-sentinel-danger/10 px-3 py-2 text-xs text-sentinel-danger">
          {error}
        </p>
      )}
    </form>
  );
}
