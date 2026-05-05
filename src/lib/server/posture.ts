import type {
  ChatMessage,
  PostureBrief,
  PosturePrediction,
  PostureRecommendation,
  ScanResult,
  SecurityEvent,
  ThreatIncident,
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

async function callOpenAi(messages: ChatMessage[]): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("no key");
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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as OpenAiResponse;
    const c = data.choices?.[0]?.message?.content;
    if (!c) throw new Error("empty");
    return c;
  } finally {
    clearTimeout(timer);
  }
}

const SYSTEM = `You are Sentinel AI, generating an executive security posture brief.
Return strict JSON matching this schema:
{
  "summary": "2-4 sentence overall posture summary",
  "topRisks": ["3-5 short bullet strings"],
  "recommendations": [
    { "title": "...", "rationale": "...",
      "priority": "low|medium|high|critical",
      "category": "hardening|access|policy|infrastructure" }
  ],
  "predictions": [
    { "title": "Predicted threat or weak point",
      "likelihood": "low|medium|high",
      "reasoning": "1-2 sentences" }
  ]
}
Provide 3-6 recommendations and 2-4 predictions. Be concrete and actionable, referencing the data given.`;

export interface PostureInput {
  events: SecurityEvent[];
  scans: ScanResult[];
  incidents: ThreatIncident[];
}

function summarize(input: PostureInput): string {
  return JSON.stringify({
    counts: {
      events: input.events.length,
      scans: input.scans.length,
      incidents: input.incidents.length,
      highCritical: input.events.filter(
        (e) => e.severity === "high" || e.severity === "critical",
      ).length,
    },
    topIncidents: input.incidents.slice(0, 8).map((i) => ({
      ip: i.ip,
      sev: i.severity,
      events: i.eventCount,
      types: i.eventTypes,
    })),
    recentScans: input.scans.slice(0, 8).map((s) => ({
      host: s.hostname,
      score: s.score,
      sev: s.severity,
      worst: s.findings
        .filter((f) => f.severity === "high" || f.severity === "critical")
        .slice(0, 3)
        .map((f) => f.title),
    })),
    recentEvents: input.events.slice(0, 20).map((e) => ({
      type: e.type,
      sev: e.severity,
      ip: e.ip,
    })),
  });
}

interface BriefJson {
  summary?: string;
  topRisks?: string[];
  recommendations?: PostureRecommendation[];
  predictions?: PosturePrediction[];
}

function stubBrief(input: PostureInput): PostureBrief {
  const hi = input.events.filter(
    (e) => e.severity === "high" || e.severity === "critical",
  ).length;
  const worstScan = [...input.scans].sort((a, b) => b.score - a.score)[0];
  const recommendations: PostureRecommendation[] = [
    {
      id: "r-headers",
      title: "Enforce strict security headers across all assets",
      rationale:
        "Several scans show missing HSTS, CSP, or X-Content-Type-Options. These are no-cost wins.",
      priority: "high",
      category: "hardening",
    },
    {
      id: "r-mfa",
      title: "Require MFA for all admin and analyst accounts",
      rationale:
        "Reduces credential-stuffing impact, which appears in recent auth-failure events.",
      priority: "high",
      category: "access",
    },
    {
      id: "r-blocklist",
      title: "Tighten honeypot auto-block thresholds",
      rationale:
        "Lower the trigger count for repeat offenders to shrink reconnaissance windows.",
      priority: "medium",
      category: "policy",
    },
    {
      id: "r-scans",
      title: "Schedule weekly automated scans for every registered asset",
      rationale:
        "Continuous scanning catches drift in TLS, headers, and exposed services.",
      priority: "medium",
      category: "infrastructure",
    },
  ];
  const predictions: PosturePrediction[] = [
    {
      id: "p-bf",
      title: "Brute-force attempts likely to continue against /login",
      likelihood: hi > 5 ? "high" : "medium",
      reasoning:
        "Repeated authentication failures in the recent window suggest an automated campaign.",
    },
    {
      id: "p-recon",
      title: "Recon traffic against fake-admin honeypots will increase",
      likelihood: "medium",
      reasoning:
        "Honeypot triggers cluster around predictable wp-login and admin paths.",
    },
  ];
  return {
    generatedAt: Date.now(),
    model: "stub",
    summary: worstScan
      ? `Posture is fair. Worst-scoring asset is ${worstScan.hostname} at ${worstScan.score}/100. ${hi} high/critical events recorded recently.`
      : `Baseline posture established. ${hi} high/critical events recorded recently.`,
    topRisks: [
      "Missing transport and content security headers on production assets",
      "Recurring authentication failures consistent with brute-force",
      "Decoy endpoints attracting steady reconnaissance traffic",
    ],
    recommendations,
    predictions,
  };
}

export async function generatePostureBrief(
  input: PostureInput,
): Promise<PostureBrief> {
  if (!getApiKey()) return stubBrief(input);
  try {
    const raw = await callOpenAi([
      { role: "system", content: SYSTEM },
      { role: "user", content: summarize(input) },
    ]);
    const parsed = JSON.parse(raw) as BriefJson;
    const recs = (parsed.recommendations ?? []).slice(0, 6).map((r, i) => ({
      id: `r-${i}`,
      title: r.title ?? `Recommendation ${i + 1}`,
      rationale: r.rationale ?? "",
      priority: r.priority ?? "medium",
      category: r.category ?? "hardening",
    }));
    const preds = (parsed.predictions ?? []).slice(0, 4).map((p, i) => ({
      id: `p-${i}`,
      title: p.title ?? `Prediction ${i + 1}`,
      likelihood: p.likelihood ?? "medium",
      reasoning: p.reasoning ?? "",
    }));
    return {
      generatedAt: Date.now(),
      model: getModel(),
      summary:
        parsed.summary?.trim() || stubBrief(input).summary,
      topRisks: Array.isArray(parsed.topRisks)
        ? parsed.topRisks.slice(0, 6)
        : stubBrief(input).topRisks,
      recommendations: recs,
      predictions: preds,
    };
  } catch {
    return stubBrief(input);
  }
}
