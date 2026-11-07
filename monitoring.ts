/**
 * Continuous-assurance engine: scan diffing, drift detection and regression
 * reopening. Pure functions over finding sets - schedulers and storage plug
 * in around them.
 */

import type { Finding } from './findings.js';
import { regressionEvent, applyEvent, canTransition } from './lifecycle.js';

export interface ScanDiff {
  /** Fingerprints never seen before this scan. */
  added: Finding[];
  /** Present before, absent now (candidate fixed - NOT verified until retest). */
  missing: Finding[];
  /** Present in both. */
  persistent: Finding[];
  /** Previously fixed_verified, now present again - reopened by this diff. */
  regressed: Finding[];
}

export function diffScans(previous: Finding[], current: Finding[], at: string, scanId: string): ScanDiff {
  const prevByFp = new Map(previous.map((f) => [f.fingerprint, f]));
  const currByFp = new Map(current.map((f) => [f.fingerprint, f]));
  const added: Finding[] = [];
  const missing: Finding[] = [];
  const persistent: Finding[] = [];
  const regressed: Finding[] = [];

  for (const [fp, cur] of currByFp) {
    const prev = prevByFp.get(fp);
    if (!prev) {
      added.push(cur);
    } else if (prev.status === 'fixed_verified') {
      if (canTransition(prev.status, 'reopen')) {
        const { finding } = applyEvent(prev, regressionEvent('monitoring', at, scanId));
        regressed.push({ ...finding, evidence: cur.evidence, lastSeenScanId: cur.lastSeenScanId });
      }
    } else {
      persistent.push({ ...cur, firstSeenScanId: prev.firstSeenScanId });
    }
  }
  for (const [fp, prev] of prevByFp) {
    if (!currByFp.has(fp) && prev.status !== 'fixed_verified') missing.push(prev);
  }
  return { added, missing, persistent, regressed };
}

/** Configuration drift: shallow diff of two snapshots of the same scope. */
export interface DriftChange {
  key: string;
  before: unknown;
  after: unknown;
}

export function diffConfig(
  baseline: Record<string, unknown>,
  current: Record<string, unknown>,
): DriftChange[] {
  const changes: DriftChange[] = [];
  const keys = new Set([...Object.keys(baseline), ...Object.keys(current)]);
  for (const key of keys) {
    const b = JSON.stringify(baseline[key]);
    const c = JSON.stringify(current[key]);
    if (b !== c) changes.push({ key, before: baseline[key], after: current[key] });
  }
  return changes.sort((a, b) => a.key.localeCompare(b.key));
}
