import { NextResponse, type NextRequest } from "next/server";
import { requireSessionUser } from "@/lib/server/session";
import { findProjectById } from "@/lib/server/projects";
import { listEventsForProject } from "@/lib/server/events";
import { getGeoForIps } from "@/lib/server/geoip";
import type { GeoInfo, SecurityEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function safeFilename(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}

function escapeCsv(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildMarkdown(
  projectName: string,
  domain: string | null,
  events: SecurityEvent[],
  geo: Map<string, GeoInfo>,
): string {
  const now = new Date().toISOString();
  const ipMap = new Map<string, SecurityEvent[]>();
  for (const e of events) {
    if (!e.ip) continue;
    const list = ipMap.get(e.ip) ?? [];
    list.push(e);
    ipMap.set(e.ip, list);
  }
  const attackers = [...ipMap.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  );
  const high = events.filter(
    (e) => e.severity === "high" || e.severity === "critical",
  ).length;
  const creds = events.filter((e) => e.type === "honeypot.credentials").length;

  let md = `# Honeypot Report — ${projectName}\n\n`;
  md += `_Generated ${now}_\n\n`;
  md += `- Domain: **${domain ?? "n/a"}**\n`;
  md += `- Total events: **${events.length}**\n`;
  md += `- Unique attacker IPs: **${attackers.length}**\n`;
  md += `- High/critical severity: **${high}**\n`;
  md += `- Credential attempts: **${creds}**\n\n`;

  md += `## Attackers\n\n`;
  md += `| IP | Country | Org | Hits | Cred attempts | First seen | Last seen |\n`;
  md += `| --- | --- | --- | ---:| ---:| --- | --- |\n`;
  for (const [ip, evs] of attackers) {
    const g = geo.get(ip);
    const first = new Date(Math.min(...evs.map((e) => e.createdAt))).toISOString();
    const last = new Date(Math.max(...evs.map((e) => e.createdAt))).toISOString();
    const credCount = evs.filter((e) => e.type === "honeypot.credentials").length;
    md += `| ${ip} | ${g?.country ?? "—"} | ${g?.org ?? "—"} | ${evs.length} | ${credCount} | ${first} | ${last} |\n`;
  }

  md += `\n## Events\n\n`;
  md += `| Time | Severity | Type | IP | Route | User Agent | Message |\n`;
  md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
  for (const e of events) {
    md += `| ${new Date(e.createdAt).toISOString()} | ${e.severity} | ${e.type} | ${e.ip ?? "—"} | ${e.route ?? "—"} | ${(e.userAgent ?? "—").replace(/\|/g, "\\|").slice(0, 120)} | ${e.message.replace(/\|/g, "\\|")} |\n`;
  }

  return md;
}

function buildCsv(events: SecurityEvent[], geo: Map<string, GeoInfo>): string {
  const headers = [
    "createdAt",
    "iso",
    "severity",
    "type",
    "ip",
    "country",
    "city",
    "org",
    "route",
    "userAgent",
    "message",
  ];
  const lines = [headers.join(",")];
  for (const e of events) {
    const g = e.ip ? geo.get(e.ip) : null;
    lines.push(
      [
        e.createdAt,
        new Date(e.createdAt).toISOString(),
        e.severity,
        e.type,
        e.ip ?? "",
        g?.country ?? "",
        g?.city ?? "",
        g?.org ?? "",
        e.route ?? "",
        e.userAgent ?? "",
        e.message,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }
  return lines.join("\n");
}

function buildJson(
  project: { id: string; name: string; domain: string | null },
  events: SecurityEvent[],
  geo: Map<string, GeoInfo>,
): string {
  return JSON.stringify(
    {
      project,
      generatedAt: new Date().toISOString(),
      eventCount: events.length,
      events: events.map((e) => ({
        ...e,
        geo: e.ip ? (geo.get(e.ip) ?? null) : null,
      })),
    },
    null,
    2,
  );
}

export async function GET(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  let user;
  try {
    user = await requireSessionUser();
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const project = await findProjectById(id);
  if (!project || project.ownerUid !== user.uid) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const format = (req.nextUrl.searchParams.get("format") ?? "md").toLowerCase();
  const events = await listEventsForProject(id, 1000);
  const ips = events.map((e) => e.ip).filter((x): x is string => Boolean(x));
  const geo = await getGeoForIps(ips);

  const filenameBase = `sentinel-report-${safeFilename(project.name)}-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    return new NextResponse(buildCsv(events, geo), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }
  if (format === "json") {
    return new NextResponse(
      buildJson(
        { id: project.id, name: project.name, domain: project.domain },
        events,
        geo,
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filenameBase}.json"`,
        },
      },
    );
  }
  // default markdown
  return new NextResponse(
    buildMarkdown(project.name, project.domain, events, geo),
    {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.md"`,
      },
    },
  );
}
