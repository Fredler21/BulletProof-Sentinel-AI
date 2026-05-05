import { randomUUID } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import type {
  Asset,
  ScanFinding,
  ScanResult,
  ThreatSeverity,
} from "@/lib/types";

const COL = "scans";
const FETCH_TIMEOUT_MS = 8000;

interface RawResponse {
  status: number | null;
  headers: Record<string, string>;
  ok: boolean;
}

async function safeFetch(url: string, method: "GET" | "HEAD"): Promise<RawResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "manual",
      signal: ctrl.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; BulletproofSentinelAI/1.0; +https://bulletproofsentinel.ai/scanner)",
      },
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      headers[k.toLowerCase()] = v;
    });
    return { status: res.status, headers, ok: res.ok };
  } catch {
    return { status: null, headers: {}, ok: false };
  } finally {
    clearTimeout(timer);
  }
}

function add(
  findings: ScanFinding[],
  partial: Omit<ScanFinding, "id">,
): void {
  findings.push({ id: randomUUID(), ...partial });
}

function severityWeight(s: ThreatSeverity): number {
  switch (s) {
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    case "critical":
      return 4;
  }
}

function maxSeverity(findings: ScanFinding[]): ThreatSeverity {
  let max: ThreatSeverity = "low";
  for (const f of findings) {
    if (severityWeight(f.severity) > severityWeight(max)) max = f.severity;
  }
  return max;
}

function totalScore(findings: ScanFinding[]): number {
  const sum = findings.reduce((acc, f) => acc + f.score, 0);
  return Math.min(100, sum);
}

// --- Header analyzers ---

function analyzeTls(url: URL, findings: ScanFinding[]): void {
  if (url.protocol !== "https:") {
    add(findings, {
      category: "tls",
      title: "Non-HTTPS endpoint",
      detail: `Asset is served over ${url.protocol} which transmits traffic in cleartext.`,
      severity: "critical",
      score: 35,
      recommendation:
        "Serve all traffic over HTTPS with a valid TLS certificate and redirect HTTP to HTTPS.",
    });
  }
}

function analyzeSecurityHeaders(
  headers: Record<string, string>,
  findings: ScanFinding[],
): void {
  if (!headers["strict-transport-security"]) {
    add(findings, {
      category: "header",
      title: "Missing Strict-Transport-Security (HSTS)",
      detail:
        "HSTS forces browsers to use HTTPS and protects against SSL-stripping attacks.",
      severity: "high",
      score: 12,
      recommendation:
        "Add: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
    });
  }

  const csp = headers["content-security-policy"];
  if (!csp) {
    add(findings, {
      category: "header",
      title: "Missing Content-Security-Policy",
      detail: "CSP mitigates XSS and data injection by restricting resource origins.",
      severity: "high",
      score: 10,
      recommendation:
        "Add a Content-Security-Policy header tailored to your app (start in Report-Only mode).",
    });
  } else if (csp.includes("unsafe-inline") || csp.includes("unsafe-eval")) {
    add(findings, {
      category: "header",
      title: "Weak Content-Security-Policy",
      detail: `CSP allows ${csp.includes("unsafe-inline") ? "'unsafe-inline'" : "'unsafe-eval'"}.`,
      severity: "medium",
      score: 5,
      recommendation: "Remove unsafe-inline/unsafe-eval; use nonces or hashes for scripts.",
    });
  }

  if (!headers["x-content-type-options"]) {
    add(findings, {
      category: "header",
      title: "Missing X-Content-Type-Options",
      detail: "Browsers may MIME-sniff responses, enabling some XSS attacks.",
      severity: "medium",
      score: 4,
      recommendation: "Add: X-Content-Type-Options: nosniff",
    });
  }

  const xfo = headers["x-frame-options"];
  const cspFrame = csp?.includes("frame-ancestors");
  if (!xfo && !cspFrame) {
    add(findings, {
      category: "header",
      title: "Missing clickjacking protection",
      detail: "Neither X-Frame-Options nor CSP frame-ancestors is present.",
      severity: "medium",
      score: 5,
      recommendation:
        "Add: X-Frame-Options: DENY  or  CSP frame-ancestors 'none'.",
    });
  }

  if (!headers["referrer-policy"]) {
    add(findings, {
      category: "header",
      title: "Missing Referrer-Policy",
      detail: "Default referrer behavior may leak full URLs to third parties.",
      severity: "low",
      score: 2,
      recommendation: "Add: Referrer-Policy: strict-origin-when-cross-origin",
    });
  }

  if (!headers["permissions-policy"]) {
    add(findings, {
      category: "header",
      title: "Missing Permissions-Policy",
      detail: "Sensitive browser features (camera, mic, geolocation) are not restricted.",
      severity: "low",
      score: 2,
      recommendation:
        "Add: Permissions-Policy: camera=(), microphone=(), geolocation=()",
    });
  }
}

function analyzeCookies(
  headers: Record<string, string>,
  findings: ScanFinding[],
): void {
  const setCookie = headers["set-cookie"];
  if (!setCookie) return;
  const lower = setCookie.toLowerCase();
  if (!lower.includes("secure")) {
    add(findings, {
      category: "cookie",
      title: "Cookie missing Secure flag",
      detail: "Cookies without Secure can be transmitted over HTTP.",
      severity: "high",
      score: 8,
      recommendation: "Add the Secure attribute to all cookies.",
    });
  }
  if (!lower.includes("httponly")) {
    add(findings, {
      category: "cookie",
      title: "Cookie missing HttpOnly flag",
      detail: "JavaScript can read the cookie, increasing XSS impact.",
      severity: "medium",
      score: 5,
      recommendation: "Add HttpOnly to session cookies.",
    });
  }
  if (!lower.includes("samesite")) {
    add(findings, {
      category: "cookie",
      title: "Cookie missing SameSite attribute",
      detail: "Default policy varies by browser; CSRF protection may be weakened.",
      severity: "low",
      score: 3,
      recommendation: "Add SameSite=Lax (or Strict) to cookies.",
    });
  }
}

function analyzeCors(
  headers: Record<string, string>,
  findings: ScanFinding[],
): void {
  const acao = headers["access-control-allow-origin"];
  const acac = headers["access-control-allow-credentials"];
  if (acao === "*" && acac === "true") {
    add(findings, {
      category: "cors",
      title: "Insecure CORS configuration",
      detail:
        "Access-Control-Allow-Origin: * combined with credentials is rejected by browsers and indicates misconfiguration.",
      severity: "high",
      score: 10,
      recommendation:
        "Restrict Access-Control-Allow-Origin to a trusted origin list when credentials are allowed.",
    });
  } else if (acao === "*") {
    add(findings, {
      category: "cors",
      title: "Wildcard CORS origin",
      detail: "Access-Control-Allow-Origin: * allows any site to read responses.",
      severity: "medium",
      score: 4,
      recommendation:
        "Restrict CORS origins to known frontends instead of using a wildcard.",
    });
  }
}

function analyzeDisclosure(
  headers: Record<string, string>,
  findings: ScanFinding[],
): {
  serverHeader: string | null;
  poweredByHeader: string | null;
} {
  const server = headers["server"] ?? null;
  const poweredBy = headers["x-powered-by"] ?? null;
  if (server && /\d/.test(server)) {
    add(findings, {
      category: "disclosure",
      title: "Server header reveals version",
      detail: `Server: ${server}`,
      severity: "low",
      score: 2,
      recommendation: "Suppress the Server response header or strip the version.",
    });
  }
  if (poweredBy) {
    add(findings, {
      category: "disclosure",
      title: "X-Powered-By header present",
      detail: `X-Powered-By: ${poweredBy}`,
      severity: "low",
      score: 2,
      recommendation: "Remove the X-Powered-By header to reduce fingerprinting.",
    });
  }
  return { serverHeader: server, poweredByHeader: poweredBy };
}

async function probeExposedPaths(
  url: URL,
  findings: ScanFinding[],
): Promise<void> {
  const candidates = [
    "/.env",
    "/.git/HEAD",
    "/wp-admin/",
    "/phpinfo.php",
    "/server-status",
  ];
  await Promise.all(
    candidates.map(async (path) => {
      const target = new URL(path, url.origin).toString();
      const res = await safeFetch(target, "GET");
      if (
        res.status &&
        res.status >= 200 &&
        res.status < 300 &&
        res.status !== 204
      ) {
        add(findings, {
          category: "exposure",
          title: `Exposed sensitive path: ${path}`,
          detail: `${target} returned HTTP ${res.status}.`,
          severity: "critical",
          score: 25,
          recommendation: `Remove or restrict access to ${path}.`,
        });
      }
    }),
  );
}

// --- Public entrypoint ---

export async function runScan(
  asset: Asset,
  ownerUid: string,
): Promise<ScanResult> {
  const startedAt = Date.now();
  const url = new URL(asset.url);

  const findings: ScanFinding[] = [];
  analyzeTls(url, findings);

  const main = await safeFetch(asset.url, "GET");
  if (!main.status) {
    add(findings, {
      category: "availability",
      title: "Asset unreachable",
      detail: `Could not connect to ${asset.url} within ${FETCH_TIMEOUT_MS}ms.`,
      severity: "medium",
      score: 6,
      recommendation:
        "Verify the URL is correct and reachable from the public internet.",
    });
  } else {
    analyzeSecurityHeaders(main.headers, findings);
    analyzeCookies(main.headers, findings);
    analyzeCors(main.headers, findings);
  }

  const disclosure = analyzeDisclosure(main.headers, findings);
  await probeExposedPaths(url, findings);

  const score = totalScore(findings);
  const severity: ThreatSeverity =
    findings.length === 0 ? "low" : maxSeverity(findings);

  const doc = adminDb.collection(COL).doc();
  const result: ScanResult = {
    id: doc.id,
    ownerUid,
    assetId: asset.id,
    url: asset.url,
    hostname: asset.hostname,
    createdAt: startedAt,
    durationMs: Date.now() - startedAt,
    statusCode: main.status,
    serverHeader: disclosure.serverHeader,
    poweredByHeader: disclosure.poweredByHeader,
    responseHeaders: main.headers,
    findings,
    score,
    severity,
  };
  await doc.set(result);
  return result;
}

export async function listScansForAsset(
  assetId: string,
  ownerUid: string,
  limit = 20,
): Promise<ScanResult[]> {
  const snap = await adminDb
    .collection(COL)
    .where("ownerUid", "==", ownerUid)
    .where("assetId", "==", assetId)
    .get();
  const items = snap.docs
    .map((d) => d.data() as ScanResult)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
  return items;
}

export async function listRecentScans(
  ownerUid: string,
  limit = 25,
): Promise<ScanResult[]> {
  const snap = await adminDb
    .collection(COL)
    .where("ownerUid", "==", ownerUid)
    .get();
  return snap.docs
    .map((d) => d.data() as ScanResult)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export async function getScan(
  id: string,
  ownerUid: string,
): Promise<ScanResult | null> {
  const doc = await adminDb.collection(COL).doc(id).get();
  const data = doc.data() as ScanResult | undefined;
  if (!data || data.ownerUid !== ownerUid) return null;
  return data;
}
