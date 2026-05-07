"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }): React.ReactElement {
  const [copied, setCopied] = useState(false);

  async function onClick(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded border border-sentinel-border px-2 py-1 text-[11px] text-sentinel-muted hover:border-sentinel-accent hover:text-sentinel-accent"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
