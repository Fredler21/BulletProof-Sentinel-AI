import type {
  ChatMessage,
  IncidentReport,
  IncidentReportScope,
  MitreMapping,
  ScanResult,
  SecurityEvent,
  ThreatExplanation,
  ThreatSeverity,
} from "@/lib/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function getApiKey(): string | null {
  const k = process.env.OPENAI_API_KEY?.trim();
  return k ? k : null;
}

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

async function callOpenAi(
  messages: ChatMessage[],
  opts: { jsonMode?: boolean; temperature?: number } = {},
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getModel(),
        temperature: opts.temperature ?? 0.2,
        messages,
        ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenAI ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as OpenAiResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned empty content");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Threat explanation ----------

const EXPLAIN_SYSTEM = `You are Sentinel AI, a senior cybersecurity analyst.
Given a single security event, produce a concise JSON object that explains it.
Always return valid JSON matching exactly this schema:
{
  "summary": "1-2 plain-English sentences",
  "whyItMatters": "1-3 sentences explaining the risk",
  "recommendedActions": ["3 to 5 short imperative actions"],
  "severity": "low|medium|high|critical",
  "mitre": [
    { "tacticId": "TAxxxx", "tacticName": "...", "techniqueId": "Txxxx", "techniqueName": "..." }
  ]
}
Map to real MITRE ATT&CK Enterprise tactics/techniques. Return at most 3 MITRE entries.`;

interface ExplainJson {
  summary?: string;
  whyItMatters?: string;
  recommendedActions?: string[];
  severity?: ThreatSeverity;
  mitre?: MitreMapping[];
}

function stubExplain(event: SecurityEvent): ThreatExplanation {
  const isHoneypot = event.type === "honeypot.trigger";
  const isAuthFail = event.type === "auth.login.failure";
  return {
    eventId: event.id,
    summary: isHoneypot
      ? `An external client touched a decoy endpoint at ${event.route ?? "an internal path"}.`
      : isAuthFail
        ? "A failed authentication attempt was recorded."
        : event.message,
    whyItMatters: isHoneypot
      ? "Legitimate users have no reason to access this path. Hits typically indicate reconnaissance or automated scanning."
      : isAuthFail
        ? "Repeated failures may indicate credential stuffing or brute-force activity."
        : "This event was flagged by the platform and should be reviewed.",
    recommendedActions: isHoneypot
      ? [
          `Block the source IP ${event.ip ?? "(unknown)"} at the edge`,
          "Check WAF logs for similar requests",
          "Increase honeypot decoys around the targeted area",
        ]
      : isAuthFail
        ? [
            "Enforce account lockout after N failures",
            "Require MFA on the affected account",
            "Investigate originating IP for related events",
          ]
        : [
            "Review the event metadata in the dashboard",
            "Correlate with other events from the same IP",
            "Document the response taken",
          ],
    severity: event.severity,
    mitre: isHoneypot
      ? [
          {
            tacticId: "TA0043",
            tacticName: "Reconnaissance",
            techniqueId: "T1595",
            techniqueName: "Active Scanning",
          },
        ]
      : isAuthFail
        ? [
            {
              tacticId: "TA0006",
              tacticName: "Credential Access",
              techniqueId: "T1110",
              techniqueName: "Brute Force",
            },
          ]
        : [],
    model: "stub",
    createdAt: Date.now(),
  };
}

export async function explainEvent(
  event: SecurityEvent,
): Promise<ThreatExplanation> {
  if (!getApiKey()) return stubExplain(event);
  try {
    const userPayload = JSON.stringify({
      type: event.type,
      severity: event.severity,
      ip: event.ip,
      userAgent: event.userAgent,
      route: event.route,
      message: event.message,
      metadata: event.metadata,
      createdAt: new Date(event.createdAt).toISOString(),
    });
    const raw = await callOpenAi(
      [
        { role: "system", content: EXPLAIN_SYSTEM },
        { role: "user", content: userPayload },
      ],
      { jsonMode: true, temperature: 0.1 },
    );
    const parsed = JSON.parse(raw) as ExplainJson;
    return {
      eventId: event.id,
      summary: parsed.summary?.trim() || event.message,
      whyItMatters:
        parsed.whyItMatters?.trim() || "No additional context provided.",
      recommendedActions: Array.isArray(parsed.recommendedActions)
        ? parsed.recommendedActions.slice(0, 6)
        : [],
      severity: parsed.severity ?? event.severity,
      mitre: Array.isArray(parsed.mitre) ? parsed.mitre.slice(0, 3) : [],
      model: getModel(),
      createdAt: Date.now(),
    };
  } catch {
    return stubExplain(event);
  }
}

// ---------- Chat ----------

const CHAT_SYSTEM = `You are Sentinel AI, an autonomous cybersecurity copilot embedded in a security dashboard.
- Be precise, technical, and action-oriented.
- When asked about findings, reference MITRE ATT&CK tactics/techniques where relevant.
- Prefer numbered, scannable lists for recommendations.
- If the user asks something outside cybersecurity, redirect briefly.`;

export async function chat(messages: ChatMessage[]): Promise<string> {
  if (!getApiKey()) {
    const last = messages.filter((m) => m.role === "user").pop();
    return [
      "AI Copilot is running in offline mode (no OPENAI_API_KEY configured).",
      "",
      `You asked: "${last?.content ?? ""}"`,
      "",
      "Set OPENAI_API_KEY in .env.local (and OPENAI_MODEL, optional) to enable live AI responses.",
    ].join("\n");
  }
  return callOpenAi(
    [{ role: "system", content: CHAT_SYSTEM }, ...messages],
    { temperature: 0.3 },
  );
}

// ---------- Incident reports ----------

const REPORT_SYSTEM = `You are Sentinel AI, generating an incident report.
Return well-formatted Markdown. Use these sections:

## Executive Summary
## Key Findings
## Timeline
## Affected Assets
## Recommendations
## MITRE ATT&CK Coverage

Be concise but specific. Reference IPs, hostnames, and timestamps from the data provided.`;

export interface ReportInput {
  scope: IncidentReportScope;
  rangeFrom: number;
  rangeTo: number;
  events: SecurityEvent[];
  scans: ScanResult[];
}

function summarizeForPrompt(input: ReportInput): string {
  const events = input.events.slice(0, 60).map((e) => ({
    t: new Date(e.createdAt).toISOString(),
    type: e.type,
    sev: e.severity,
    ip: e.ip,
    route: e.route,
    msg: e.message,
  }));
  const scans = input.scans.slice(0, 20).map((s) => ({
    t: new Date(s.createdAt).toISOString(),
    host: s.hostname,
    score: s.score,
    sev: s.severity,
    findings: s.findings.map((f) => `${f.severity}:${f.title}`),
  }));
  return JSON.stringify({
    scope: input.scope,
    range: {
      from: new Date(input.rangeFrom).toISOString(),
      to: new Date(input.rangeTo).toISOString(),
    },
    counts: {
      events: input.events.length,
      scans: input.scans.length,
      highCritical: input.events.filter(
        (e) => e.severity === "high" || e.severity === "critical",
      ).length,
    },
    events,
    scans,
  });
}

function stubReport(input: ReportInput): string {
  const hi = input.events.filter(
    (e) => e.severity === "high" || e.severity === "critical",
  ).length;
  return [
    "## Executive Summary",
    `In the selected window, the platform recorded **${input.events.length} security events** and **${input.scans.length} vulnerability scans**, including **${hi} high/critical events**.`,
    "",
    "## Key Findings",
    ...input.scans.slice(0, 5).map(
      (s) =>
        `- **${s.hostname}** scored **${s.score}/100** (${s.severity}) with ${s.findings.length} findings.`,
    ),
    "",
    "## Timeline",
    ...input.events.slice(0, 10).map(
      (e) =>
        `- ${new Date(e.createdAt).toISOString()} — \`${e.type}\` (${e.severity}) ${e.message}`,
    ),
    "",
    "## Affected Assets",
    ...Array.from(new Set(input.scans.map((s) => s.hostname))).map(
      (h) => `- ${h}`,
    ),
    "",
    "## Recommendations",
    "1. Block high-confidence offending IPs at the edge.",
    "2. Apply missing security headers identified by recent scans.",
    "3. Rotate credentials linked to authentication failures.",
    "4. Schedule weekly scans for all registered assets.",
    "",
    "## MITRE ATT&CK Coverage",
    "- TA0043 Reconnaissance — T1595 Active Scanning",
    "- TA0006 Credential Access — T1110 Brute Force",
    "",
    "_Report generated in offline mode (no OPENAI_API_KEY)._",
  ].join("\n");
}

export async function generateReportBody(input: ReportInput): Promise<{
  body: string;
  model: string;
}> {
  if (!getApiKey()) {
    return { body: stubReport(input), model: "stub" };
  }
  try {
    const body = await callOpenAi(
      [
        { role: "system", content: REPORT_SYSTEM },
        {
          role: "user",
          content: `Generate a ${input.scope} incident report from the following data:\n\n${summarizeForPrompt(input)}`,
        },
      ],
      { temperature: 0.2 },
    );
    return { body, model: getModel() };
  } catch {
    return { body: stubReport(input), model: "stub-fallback" };
  }
}

export function buildReport(
  input: ReportInput,
  body: string,
  model: string,
  ownerUid: string,
  id: string,
): IncidentReport {
  const highCriticalCount = input.events.filter(
    (e) => e.severity === "high" || e.severity === "critical",
  ).length;
  const title =
    input.scope === "executive"
      ? `Executive briefing — ${new Date(input.rangeTo).toISOString().slice(0, 10)}`
      : `Technical incident report — ${new Date(input.rangeTo).toISOString().slice(0, 10)}`;
  return {
    id,
    ownerUid,
    scope: input.scope,
    title,
    rangeFrom: input.rangeFrom,
    rangeTo: input.rangeTo,
    body,
    eventCount: input.events.length,
    scanCount: input.scans.length,
    highCriticalCount,
    model,
    createdAt: Date.now(),
  };
}
