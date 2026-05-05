"use client";

import { useEffect, useRef, useState } from "react";
import type { FeedItemWithCoords } from "./LiveCommandCenter";

interface Toast {
  id: string;
  title: string;
  body: string;
  sev: string;
}

export function FloatingAlerts({
  items,
}: {
  items: FeedItemWithCoords[];
}): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newOnes: Toast[] = [];
    for (const it of items) {
      if (seen.current.has(it.id)) continue;
      seen.current.add(it.id);
      const sev = it.severity ?? "info";
      if (sev !== "high" && sev !== "critical") continue;
      newOnes.push({
        id: it.id,
        title: `${sev.toUpperCase()} · ${it.type ?? "event"}`,
        body: `${it.ip ?? "unknown"} · ${it.geo?.country ?? "??"}`,
        sev,
      });
    }
    if (newOnes.length === 0) return;
    setToasts((prev) => [...prev, ...newOnes].slice(-5));
    for (const t of newOnes) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, 6500);
    }
  }, [items]);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`glass holo-border hud-frame pointer-events-auto rounded-xl border p-3 shadow-2xl ${
            t.sev === "critical"
              ? "border-neon-red/40 shadow-neon-red"
              : "border-neon-pink/40 shadow-neon-pink"
          }`}
          style={{ animation: "pop 0.35s ease-out" }}
        >
          <div className="flex items-center justify-between">
            <p
              className={`font-mono text-[10px] font-bold uppercase tracking-[0.3em] ${
                t.sev === "critical" ? "text-neon-red" : "text-neon-pink"
              }`}
            >
              ⚠ {t.title}
            </p>
            <span className="font-mono text-[9px] text-slate-500">
              auto-dismiss
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-slate-200">{t.body}</p>
        </div>
      ))}
      <style jsx>{`
        @keyframes pop {
          from {
            transform: translateX(20px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
