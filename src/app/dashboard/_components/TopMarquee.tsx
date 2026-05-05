"use client";

import { useEffect, useState } from "react";

export function TopMarquee({ role }: { role: string }): React.ReactElement {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const t = setInterval(
      () => setNow(new Date().toUTCString().slice(17, 25)),
      1000,
    );
    setNow(new Date().toUTCString().slice(17, 25));
    return () => clearInterval(t);
  }, []);
  const items: string[] = [
    `OPERATOR :: ${role.toUpperCase()}`,
    `UTC ${now}`,
    "AUTO-DEFENSE :: ENGAGED",
    "HONEYPOT GRID :: 100%",
    "AI COPILOT :: ONLINE",
    "TELEMETRY STREAM :: STABLE",
    "GEO-FENCE :: GLOBAL",
    "INTEL FEED :: SYNC",
    "RUNTIME :: NODE+EDGE",
    "BUILD :: SENTINEL/v5.1.0",
  ];
  const text = items.join("  ◆  ");
  return (
    <div className="relative overflow-hidden border-y border-neon-cyan/20 bg-black/40 py-1 text-[10px] font-medium text-neon-cyan/90">
      <div className="marquee font-mono">
        <span>{text}</span>
        <span aria-hidden>{text}</span>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
    </div>
  );
}
