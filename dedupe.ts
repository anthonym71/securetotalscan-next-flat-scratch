/**
 * Cross-tool finding dedupe. Different tools report the same underlying
 * issue with different wording, so identity is derived from a normalised
 * fingerprint, not from titles or tool-specific ids.
 */

import type { Evidence, Finding } from './findings.js';

/** FNV-1a 64-bit: stable, dependency-free, works in Node and the browser.
 *  Fingerprints are identity keys, not security tokens, so a non-crypto
 *  hash is the right tool here. */
function stableHash(input: string): string {
  let h1 = 0x811c9dc5 ^ 0x100;
  let h2 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ (c & 0xff), 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c >> 8), 0x01000193) >>> 0;
  }
  return (h2.toString(16).padStart(8, '0') + h1.toString(16).padStart(8, '0'));
}

export interface RawFinding {
  title: string;
  category: string;
  severity: Finding['severity'];
  confidence: Finding['confidence'];
  asset: Finding['asset'];
  evidence: Evidence[];
  source: string; // tool/agent name
  scanId: string;
}

function normaliseAsset(asset: RawFinding['asset']): string {
  let v = asset.value.trim().toLowerCase();
  if (asset.kind === 'url') {
    v = v.replace(/^https?:\/\//, '');
    v = v.split(/[?#]/)[0]; // query strings and fragments never identify an asset
    v = v.replace(/\/+$/, '');
  }
  return `${asset.kind}:${v}`;
}

function normaliseTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable identity for "the same underlying issue on the same asset". */
export function fingerprint(raw: Pick<RawFinding, 'title' | 'category' | 'asset'>): string {
  const basis = `${raw.category}|${normaliseAsset(raw.asset)}|${normaliseTitle(raw.title)}`;
  return stableHash(basis);
}

/** Merge a duplicate report into an existing finding.
 *  - Evidence and sources accumulate.
 *  - Confidence escalates to the strongest seen (a confirmed report anywhere
 *    confirms the finding); severity follows the most recent scan's report.
 *  - The earliest firstSeen and latest lastSeen win. */
export function mergeInto(existing: Finding, raw: RawFinding): Finding {
  const confidence =
    raw.confidence === 'confirmed' || existing.confidence === 'confirmed'
      ? 'confirmed'
      : raw.confidence === 'suspected' || existing.confidence === 'suspected'
        ? 'suspected'
        : 'unverified';
  const sources = Array.from(new Set([...existing.sources, raw.source])).sort();
  const evKeys = new Set(existing.evidence.map((e) => e.type + '|' + e.summary));
  const evidence = [
    ...existing.evidence,
    ...raw.evidence.filter((e) => !evKeys.has(e.type + '|' + e.summary)),
  ];
  return {
    ...existing,
    severity: raw.severity, // latest scan's assessment wins
    confidence,
    sources,
    evidence,
    lastSeenScanId: raw.scanId,
  };
}

export interface DedupeResult {
  findings: Finding[];
  /** How many raw reports collapsed into existing findings. */
  mergedCount: number;
}

let counter = 0;
/** Fold raw reports from any number of tools into one deduplicated set. */
export function dedupe(rawReports: RawFinding[]): DedupeResult {
  const byFp = new Map<string, Finding>();
  let mergedCount = 0;
  for (const raw of rawReports) {
    const fp = fingerprint(raw);
    const existing = byFp.get(fp);
    if (existing) {
      byFp.set(fp, mergeInto(existing, raw));
      mergedCount++;
    } else {
      byFp.set(fp, {
        id: `F-${(++counter).toString(36).padStart(4, '0')}`,
        fingerprint: fp,
        title: raw.title,
        category: raw.category,
        severity: raw.severity,
        confidence: raw.confidence,
        asset: raw.asset,
        evidence: raw.evidence,
        status: 'open',
        sources: [raw.source],
        firstSeenScanId: raw.scanId,
        lastSeenScanId: raw.scanId,
      });
    }
  }
  return { findings: Array.from(byFp.values()), mergedCount };
}
