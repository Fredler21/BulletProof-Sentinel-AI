export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export type SecurityEventType =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.signup"
  | "honeypot.trigger"
  | "scan.suspicious"
  | "system";

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: ThreatSeverity;
  ip: string | null;
  userAgent: string | null;
  route: string | null;
  message: string;
  metadata: Record<string, string | number | boolean | null>;
  createdAt: number;
  ownerUid: string | null;
}

export interface HoneypotTrap {
  id: string;
  name: string;
  path: string;
  kind: "fake-admin" | "fake-api" | "hidden-route";
  description: string;
  createdAt: number;
  hits: number;
}

export interface AlertItem {
  id: string;
  title: string;
  severity: ThreatSeverity;
  source: string;
  createdAt: number;
  acknowledged: boolean;
  eventId: string | null;
  status?: AlertStatus;
  assigneeUid?: string | null;
  assigneeName?: string | null;
  notesCount?: number;
}

export interface DashboardStats {
  totalEvents: number;
  highSeverityEvents: number;
  honeypotHits: number;
  uniqueIps: number;
}

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// ---------- Phase 2 ----------

export interface Asset {
  id: string;
  ownerUid: string;
  name: string;
  url: string;
  hostname: string;
  createdAt: number;
  lastScanAt: number | null;
  lastScore: number | null;
  lastSeverity: ThreatSeverity | null;
}

export type FindingCategory =
  | "tls"
  | "header"
  | "cookie"
  | "cors"
  | "disclosure"
  | "exposure"
  | "availability";

export interface ScanFinding {
  id: string;
  category: FindingCategory;
  title: string;
  detail: string;
  severity: ThreatSeverity;
  score: number; // contribution to total risk score (higher = worse)
  recommendation: string;
}

export interface ScanResult {
  id: string;
  ownerUid: string;
  assetId: string;
  url: string;
  hostname: string;
  createdAt: number;
  durationMs: number;
  statusCode: number | null;
  serverHeader: string | null;
  poweredByHeader: string | null;
  responseHeaders: Record<string, string>;
  findings: ScanFinding[];
  score: number; // total risk score (0 = best, 100 = worst)
  severity: ThreatSeverity;
}

export interface GeoInfo {
  ip: string;
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  org: string | null;
  asn: string | null;
  cachedAt: number;
}

// ---------- Phase 3 — AI Copilot ----------

export interface MitreMapping {
  tacticId: string; // e.g. "TA0001"
  tacticName: string; // e.g. "Initial Access"
  techniqueId: string; // e.g. "T1078"
  techniqueName: string; // e.g. "Valid Accounts"
}

export interface ThreatExplanation {
  eventId: string;
  summary: string; // 1-2 sentences in plain English
  whyItMatters: string;
  recommendedActions: string[];
  severity: ThreatSeverity;
  mitre: MitreMapping[];
  model: string; // model used or "stub"
  createdAt: number;
}

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type IncidentReportScope = "executive" | "technical";

export interface IncidentReport {
  id: string;
  ownerUid: string;
  scope: IncidentReportScope;
  title: string;
  rangeFrom: number; // ms epoch
  rangeTo: number; // ms epoch
  body: string; // markdown
  eventCount: number;
  scanCount: number;
  highCriticalCount: number;
  model: string;
  createdAt: number;
}

// ---------- Phase 4 — Autonomous Operations & Collaboration ----------

export type BlockSource =
  | "manual"
  | "auto.honeypot.flood"
  | "auto.scan.exposure"
  | "auto.auth.bruteforce";

export interface BlockedIp {
  ip: string;
  reason: string;
  source: BlockSource;
  createdByUid: string | null;
  createdAt: number;
  expiresAt: number | null; // null = permanent
  hits: number; // number of subsequent attempts after block
  lastAttemptAt: number | null;
}

export type AlertStatus = "open" | "investigating" | "resolved";

export interface AlertNote {
  id: string;
  alertId: string;
  authorUid: string;
  authorName: string | null;
  body: string;
  createdAt: number;
}
