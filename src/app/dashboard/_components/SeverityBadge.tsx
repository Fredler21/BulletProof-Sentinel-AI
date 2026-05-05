import type { ThreatSeverity } from "@/lib/types";

const styles: Record<ThreatSeverity, string> = {
  low: "bg-sentinel-ok/10 text-sentinel-ok border-sentinel-ok/30",
  medium: "bg-sentinel-warn/10 text-sentinel-warn border-sentinel-warn/30",
  high: "bg-sentinel-danger/10 text-sentinel-danger border-sentinel-danger/40",
  critical: "bg-sentinel-danger/20 text-sentinel-danger border-sentinel-danger/60",
};

export function SeverityBadge({
  severity,
}: {
  severity: ThreatSeverity;
}): React.ReactElement {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}
