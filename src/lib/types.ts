export type ThreatSeverity = "low" | "medium" | "high" | "critical";

export type SecurityEventType =
  | "auth.login.success"
  | "auth.login.failure"
  | "auth.signup"
  | "honeypot.trigger"
  | "honeypot.credentials"
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
  lat: number | null;
  lon: number | null;
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

// ---------- Phase 5 — Enterprise Ecosystem ----------

export type UserRole =
  | "super-admin"
  | "security-analyst"
  | "it-admin"
  | "viewer";

export interface UserRoleDoc {
  uid: string;
  email: string | null;
  role: UserRole;
  assignedByUid: string | null;
  updatedAt: number;
}

export interface ThreatIncident {
  id: string;
  title: string;
  ip: string | null;
  severity: ThreatSeverity;
  eventCount: number;
  eventTypes: SecurityEventType[];
  firstSeenAt: number;
  lastSeenAt: number;
  routes: string[];
  eventIds: string[];
  status: "active" | "contained" | "closed";
  notes?: string | null;
}

export interface PostureRecommendation {
  id: string;
  title: string;
  rationale: string;
  priority: "low" | "medium" | "high" | "critical";
  category: "hardening" | "access" | "policy" | "infrastructure";
}

export interface PosturePrediction {
  id: string;
  title: string;
  likelihood: "low" | "medium" | "high";
  reasoning: string;
}

export interface PostureBrief {
  generatedAt: number;
  model: string;
  summary: string;
  topRisks: string[];
  recommendations: PostureRecommendation[];
  predictions: PosturePrediction[];
}

export type ComplianceStatus = "pass" | "warn" | "fail" | "manual";

export interface ComplianceControl {
  id: string;
  framework: "SOC2" | "ISO27001" | "HIPAA" | "GDPR";
  code: string; // e.g. "CC6.1"
  title: string;
  description: string;
  status: ComplianceStatus;
  evidence: string;
}

export interface ComplianceFrameworkSummary {
  framework: ComplianceControl["framework"];
  pass: number;
  warn: number;
  fail: number;
  manual: number;
  total: number;
  scorePct: number;
}

// ---------- Phase 6 — Embeddable Honeypot API ----------

export interface HoneypotProject {
  id: string;
  ownerUid: string;
  name: string;
  domain: string | null;
  apiKeyPrefix: string; // e.g. "bps_live_abc"
  apiKeyHash: string;   // sha256 of the full key
  createdAt: number;
  hits: number;
  lastHitAt: number | null;
}

export interface BeaconPayload {
  path: string;
  method?: string;
  ip?: string | null;
  userAgent?: string | null;
  username?: string | null;
  passwordLength?: number | null;
  message?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}
