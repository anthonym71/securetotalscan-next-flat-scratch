/**
 * Finding evidence model.
 * A finding is only as strong as its evidence. Confidence is explicit:
 * 'confirmed' means a reproducible safe check proved it; 'suspected' means
 * indicators point at it; 'unverified' means a tool or agent claimed it
 * without supporting evidence. Unverified findings never raise a grade.
 */

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'confirmed' | 'suspected' | 'unverified';

export type AssetKind = 'url' | 'repo' | 'image' | 'host' | 'package';

export interface AssetRef {
  kind: AssetKind;
  /** Normalised identifier: origin for urls, owner/repo for repos, etc. */
  value: string;
  version?: string;
}

export type EvidenceType = 'http' | 'code' | 'log' | 'config' | 'note';

export interface Evidence {
  type: EvidenceType;
  /** One-line human summary of what was observed. */
  summary: string;
  /** Supporting detail. MUST already be passed through redactSecrets. */
  detail?: string;
  capturedAt: string; // ISO 8601
  /** Safe, reproducible steps or request that demonstrates the finding. */
  reproduction?: string;
}

export interface FixProposal {
  summary: string;
  /** Unified diff, config snippet, or step list. Never auto-applied. */
  patch?: string;
  proposedBy: string; // actor id or agent name
  proposedAt: string;
}

export type FindingStatus =
  | 'open'
  | 'fix_proposed'
  | 'awaiting_retest'
  | 'fixed_verified'
  | 'still_exposed'
  | 'not_verifiable'
  | 'reopened';

export interface Finding {
  id: string;
  /** Stable cross-tool identity from dedupe.fingerprint(). */
  fingerprint: string;
  title: string;
  category: string; // e.g. 'headers', 'cors', 'secrets', 'ssl', 'exposed-files'
  severity: Severity;
  confidence: Confidence;
  asset: AssetRef;
  evidence: Evidence[];
  fix?: FixProposal;
  status: FindingStatus;
  /** Tool/agent names that independently reported this issue. */
  sources: string[];
  firstSeenScanId: string;
  lastSeenScanId: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const CONFIDENCE_RANK: Record<Confidence, number> = {
  confirmed: 3,
  suspected: 2,
  unverified: 1,
};

export function severityRank(s: Severity): number {
  return SEVERITY_RANK[s];
}

export function confidenceRank(c: Confidence): number {
  return CONFIDENCE_RANK[c];
}

/** Higher severity first; ties broken by confidence, then title. */
export function compareFindings(a: Finding, b: Finding): number {
  const s = severityRank(b.severity) - severityRank(a.severity);
  if (s !== 0) return s;
  const c = confidenceRank(b.confidence) - confidenceRank(a.confidence);
  if (c !== 0) return c;
  return a.title.localeCompare(b.title);
}

/** Grading must never reward silence: unverified findings do not lower or
 *  raise a score, and a scan with incomplete coverage is reported as such. */
export function gradeFindings(
  findings: Finding[],
  coverageComplete: boolean,
): { grade: 'A' | 'B' | 'C' | 'D' | 'F' | 'INCOMPLETE'; rationale: string } {
  if (!coverageComplete) {
    return {
      grade: 'INCOMPLETE',
      rationale:
        'Scan coverage was incomplete. An incomplete scan is never reported as a passing grade.',
    };
  }
  const actionable = findings.filter((f) => f.confidence !== 'unverified');
  const max = actionable.reduce(
    (m, f) => Math.max(m, severityRank(f.severity)),
    0,
  );
  if (max >= 5) return { grade: 'F', rationale: 'Confirmed or suspected critical exposure.' };
  if (max >= 4) return { grade: 'D', rationale: 'High-severity exposure present.' };
  if (max >= 3) return { grade: 'C', rationale: 'Medium-severity exposure present.' };
  if (max >= 2) return { grade: 'B', rationale: 'Low-severity findings only.' };
  return { grade: 'A', rationale: 'No confirmed or suspected findings.' };
}
