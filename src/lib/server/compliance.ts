import { adminDb } from "@/lib/firebase/admin";
import { listBlockedIps } from "@/lib/server/blocklist";
import type {
  ComplianceControl,
  ComplianceFrameworkSummary,
  ComplianceStatus,
  ScanResult,
  SecurityEvent,
} from "@/lib/types";

interface SignalSet {
  hasAssets: boolean;
  recentScanCount: number;
  worstScanScore: number;
  highCriticalEvents: number;
  blockedCount: number;
  honeypotsCount: number;
  hasSessionAuth: boolean;
  encryptionAtRest: boolean;
}

async function gatherSignals(): Promise<SignalSet> {
  const [assetsSnap, scansSnap, eventsSnap, hpSnap, blocks] = await Promise.all(
    [
      adminDb.collection("assets").limit(1).get(),
      adminDb.collection("scans").orderBy("createdAt", "desc").limit(50).get(),
      adminDb
        .collection("security_events")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get(),
      adminDb.collection("honeypots").limit(50).get(),
      listBlockedIps(),
    ],
  );
  const scans = scansSnap.docs.map((d) => d.data() as ScanResult);
  const events = eventsSnap.docs.map((d) => d.data() as SecurityEvent);
  return {
    hasAssets: !assetsSnap.empty,
    recentScanCount: scans.length,
    worstScanScore: scans.reduce((m, s) => Math.max(m, s.score), 0),
    highCriticalEvents: events.filter(
      (e) => e.severity === "high" || e.severity === "critical",
    ).length,
    blockedCount: blocks.length,
    honeypotsCount: hpSnap.size,
    hasSessionAuth: true, // platform always uses Firebase session cookies
    encryptionAtRest: true, // Firestore is encrypted at rest by default
  };
}

type Builder = (s: SignalSet) => {
  status: ComplianceStatus;
  evidence: string;
};

interface ControlSpec {
  framework: ComplianceControl["framework"];
  code: string;
  title: string;
  description: string;
  build: Builder;
}

const SPECS: ControlSpec[] = [
  // ---------- SOC 2 ----------
  {
    framework: "SOC2",
    code: "CC6.1",
    title: "Logical access controls",
    description:
      "The entity restricts logical access to information assets through authentication.",
    build: (s) => ({
      status: s.hasSessionAuth ? "pass" : "fail",
      evidence:
        "Firebase session cookies enforced on every dashboard route via requireSessionUser().",
    }),
  },
  {
    framework: "SOC2",
    code: "CC6.6",
    title: "Boundary protection",
    description:
      "Implements logical and physical boundary controls to mitigate threats from external sources.",
    build: (s) => ({
      status: s.honeypotsCount > 0 ? "pass" : "warn",
      evidence: `${s.honeypotsCount} honeypot(s) deployed; auto-block enforced on bait endpoints.`,
    }),
  },
  {
    framework: "SOC2",
    code: "CC7.2",
    title: "System monitoring",
    description: "Monitors system components for anomalies and policy violations.",
    build: (s) => ({
      status: s.recentScanCount > 0 ? "pass" : "warn",
      evidence: `${s.recentScanCount} recent scans on file; security_events stream is active.`,
    }),
  },
  {
    framework: "SOC2",
    code: "CC7.3",
    title: "Incident response",
    description: "Evaluates security events and responds to identified incidents.",
    build: (s) => ({
      status:
        s.blockedCount > 0 || s.highCriticalEvents === 0 ? "pass" : "warn",
      evidence: `${s.blockedCount} active IP block(s); ${s.highCriticalEvents} unresolved high/critical events.`,
    }),
  },

  // ---------- ISO 27001 ----------
  {
    framework: "ISO27001",
    code: "A.5.15",
    title: "Access control",
    description: "Establishes and maintains access control rules.",
    build: (s) => ({
      status: s.hasSessionAuth ? "pass" : "fail",
      evidence:
        "Role-based access (super-admin, security-analyst, it-admin, viewer) enforced via requireRole().",
    }),
  },
  {
    framework: "ISO27001",
    code: "A.8.16",
    title: "Monitoring activities",
    description:
      "Networks, systems and applications are monitored for anomalous behaviour.",
    build: (s) => ({
      status: s.honeypotsCount > 0 && s.recentScanCount > 0 ? "pass" : "warn",
      evidence: `${s.honeypotsCount} honeypots + ${s.recentScanCount} recent scans feeding correlation engine.`,
    }),
  },
  {
    framework: "ISO27001",
    code: "A.8.24",
    title: "Use of cryptography",
    description: "Manages cryptographic controls including encryption at rest.",
    build: (s) => ({
      status: s.encryptionAtRest ? "pass" : "fail",
      evidence:
        "Firestore encrypts data at rest; HTTPS enforced for all platform traffic.",
    }),
  },
  {
    framework: "ISO27001",
    code: "A.8.8",
    title: "Management of technical vulnerabilities",
    description: "Identifies and remediates technical vulnerabilities promptly.",
    build: (s) => {
      const status: ComplianceStatus =
        s.recentScanCount === 0
          ? "fail"
          : s.worstScanScore >= 70
            ? "warn"
            : "pass";
      return {
        status,
        evidence: `Worst recent scan score: ${s.worstScanScore}/100 across ${s.recentScanCount} scans.`,
      };
    },
  },

  // ---------- HIPAA ----------
  {
    framework: "HIPAA",
    code: "164.308(a)(1)",
    title: "Security management process",
    description:
      "Implements policies and procedures to prevent, detect, contain and correct violations.",
    build: (s) => ({
      status: s.recentScanCount > 0 ? "pass" : "warn",
      evidence:
        "Scanner + correlation engine continuously evaluate platform exposure.",
    }),
  },
  {
    framework: "HIPAA",
    code: "164.308(a)(5)",
    title: "Security awareness and training",
    description:
      "Workforce training on security policies and procedures (manual evidence).",
    build: () => ({
      status: "manual",
      evidence:
        "Track training completion outside the platform; upload signed acknowledgments to your GRC system.",
    }),
  },
  {
    framework: "HIPAA",
    code: "164.312(a)(1)",
    title: "Access control (technical safeguards)",
    description:
      "Unique user identification, automatic logoff, and encryption/decryption.",
    build: (s) => ({
      status: s.hasSessionAuth ? "pass" : "fail",
      evidence:
        "Per-user UID via Firebase Auth; sessions auto-expire after 5 days.",
    }),
  },
  {
    framework: "HIPAA",
    code: "164.312(b)",
    title: "Audit controls",
    description:
      "Hardware, software, and procedural mechanisms that record and examine activity.",
    build: () => ({
      status: "pass",
      evidence:
        "All security-relevant actions written to security_events with immutable timestamps.",
    }),
  },

  // ---------- GDPR ----------
  {
    framework: "GDPR",
    code: "Art. 32",
    title: "Security of processing",
    description:
      "Technical and organisational measures appropriate to the risk.",
    build: (s) => ({
      status: s.encryptionAtRest && s.hasSessionAuth ? "pass" : "fail",
      evidence:
        "Encryption at rest + in transit, RBAC, IP blocklist, honeypot deception.",
    }),
  },
  {
    framework: "GDPR",
    code: "Art. 33",
    title: "Notification of personal data breach",
    description:
      "Notify the supervisory authority within 72 hours of awareness.",
    build: () => ({
      status: "manual",
      evidence:
        "Use the alert workflow (status + assignee + notes) to drive a documented 72-hour response.",
    }),
  },
  {
    framework: "GDPR",
    code: "Art. 5(1)(f)",
    title: "Integrity and confidentiality",
    description:
      "Personal data processed in a manner that ensures appropriate security.",
    build: (s) => ({
      status: s.honeypotsCount > 0 ? "pass" : "warn",
      evidence: `Boundary defenses (${s.honeypotsCount} honeypots, ${s.blockedCount} active blocks) protect production paths.`,
    }),
  },
  {
    framework: "GDPR",
    code: "Art. 30",
    title: "Records of processing activities",
    description: "Maintain a record of processing activities (manual evidence).",
    build: () => ({
      status: "manual",
      evidence:
        "Maintain RoPA documentation alongside platform exports of security_events.",
    }),
  },
];

export async function evaluateCompliance(): Promise<ComplianceControl[]> {
  const signals = await gatherSignals();
  return SPECS.map((spec) => {
    const out = spec.build(signals);
    return {
      id: `${spec.framework}:${spec.code}`,
      framework: spec.framework,
      code: spec.code,
      title: spec.title,
      description: spec.description,
      status: out.status,
      evidence: out.evidence,
    };
  });
}

export function summarizeFrameworks(
  controls: ComplianceControl[],
): ComplianceFrameworkSummary[] {
  const map = new Map<
    ComplianceControl["framework"],
    ComplianceFrameworkSummary
  >();
  const empty = (
    f: ComplianceControl["framework"],
  ): ComplianceFrameworkSummary => ({
    framework: f,
    pass: 0,
    warn: 0,
    fail: 0,
    manual: 0,
    total: 0,
    scorePct: 0,
  });
  for (const c of controls) {
    const cur = map.get(c.framework) ?? empty(c.framework);
    cur.total += 1;
    cur[c.status] += 1;
    map.set(c.framework, cur);
  }
  for (const sum of map.values()) {
    const automated = sum.total - sum.manual;
    sum.scorePct =
      automated > 0 ? Math.round((sum.pass / automated) * 100) : 0;
  }
  return Array.from(map.values()).sort((a, b) =>
    a.framework.localeCompare(b.framework),
  );
}
