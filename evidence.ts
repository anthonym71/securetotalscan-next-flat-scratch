/**
 * Evidence handling with enforced redaction. Evidence is where trust is
 * earned, and also where secrets leak if you are careless. Every evidence
 * record created through makeEvidence is redacted; the redactor is the
 * tested unit. Redacted values are never recoverable from stored evidence.
 */

import type { Evidence, EvidenceType } from './findings.js';

const PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'aws-access-key', re: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g },
  { name: 'github-token', re: /\b(ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/g },
  { name: 'stripe-key', re: /\b[sr]k_(live|test)_[A-Za-z0-9]{10,}\b/g },
  { name: 'slack-webhook', re: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/g },
  { name: 'bearer', re: /\bBearer\s+[A-Za-z0-9._~+/=-]{10,}/gi },
  { name: 'generic-secret', re: /\b(api[_-]?key|secret|password|token)(["'\s:=]+)([^\s"']{8,})/gi },
  { name: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
];

export function redactSecrets(input: string): string {
  let out = input;
  for (const { name, re } of PATTERNS) {
    out = out.replace(re, (match) => {
      if (name === 'generic-secret') {
        const m = match.match(/\b(api[_-]?key|secret|password|token)(["'\s:=]+)/i);
        return m ? `${m[1]}${m[2]}[REDACTED:${name}]` : `[REDACTED:${name}]`;
      }
      return `[REDACTED:${name}]`;
    });
  }
  return out;
}

export function makeEvidence(
  type: EvidenceType,
  summary: string,
  capturedAt: string,
  detail?: string,
  reproduction?: string,
): Evidence {
  return {
    type,
    summary: redactSecrets(summary),
    detail: detail === undefined ? undefined : redactSecrets(detail),
    capturedAt,
    reproduction: reproduction === undefined ? undefined : redactSecrets(reproduction),
  };
}

/** Serialise evidence for a report. Redaction already applied at creation;
 *  this pass is defence in depth for hand-constructed records. */
export function serialiseEvidence(e: Evidence): Evidence {
  return makeEvidence(e.type, e.summary, e.capturedAt, e.detail, e.reproduction);
}
