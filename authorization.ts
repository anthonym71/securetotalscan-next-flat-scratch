/**
 * Ownership verification and testing-scope enforcement.
 *
 * The gate (authoriseScan) is fail-closed: anything unverified, expired,
 * out of scope, or ambiguous is refused with named reasons. Production
 * active testing additionally requires an explicit production
 * acknowledgement recorded in the scope. Verification adapters (DNS TXT,
 * .well-known file, GitHub OAuth) are interfaces - real network adapters
 * plug in later; the gate logic itself is complete and tested here.
 */

export type VerificationMethodType = 'dns_txt' | 'well_known_file' | 'github_oauth' | 'signed_letter';

export interface Verification {
  status: 'unverified' | 'verified' | 'expired';
  method?: VerificationMethodType;
  /** Token/artefact reference. Never the secret itself. */
  artefactRef?: string;
  verifiedAt?: string;
  expiresAt?: string;
}

export type Technique =
  | 'passive_headers'
  | 'content_analysis'
  | 'exposed_file_probe'
  | 'crawl'
  | 'dast_baseline'   // non-destructive active templates
  | 'dast_authenticated'
  | 'dependency_audit'
  | 'secret_scan_history';

export const ACTIVE_TECHNIQUES: ReadonlySet<Technique> = new Set([
  'dast_baseline',
  'dast_authenticated',
]);

export interface TargetScope {
  techniques: Technique[];
  rateLimitPerMinute: number;
  allowActive: boolean;
  environment: 'staging' | 'production';
  /** Required for active techniques against production. */
  productionAcknowledged?: boolean;
  expiresAt?: string;
}

export interface Target {
  id: string;
  kind: 'url' | 'repo' | 'image';
  value: string;
  verification: Verification;
  scope: TargetScope;
}

export interface AuthorisationDecision {
  allowed: boolean;
  refused: string[];
  grantedTechniques: Technique[];
}

export function authoriseScan(
  target: Target,
  requested: Technique[],
  now: Date = new Date(),
): AuthorisationDecision {
  const refused: string[] = [];

  if (target.verification.status !== 'verified') {
    refused.push(`Target verification is '${target.verification.status}', not 'verified'.`);
  }
  if (target.verification.expiresAt && new Date(target.verification.expiresAt) <= now) {
    refused.push('Target verification has expired.');
  }
  if (target.scope.expiresAt && new Date(target.scope.expiresAt) <= now) {
    refused.push('Testing scope has expired.');
  }

  // Fail-closed: an unverified, expired or out-of-scope target grants nothing.
  const targetLevelBlock = refused.length > 0;
  const granted: Technique[] = [];
  for (const t of targetLevelBlock ? [] : requested) {
    if (!target.scope.techniques.includes(t)) {
      refused.push(`Technique '${t}' is not in the agreed scope for this target.`);
      continue;
    }
    if (ACTIVE_TECHNIQUES.has(t)) {
      if (!target.scope.allowActive) {
        refused.push(`Active technique '${t}' refused: scope does not allow active testing.`);
        continue;
      }
      if (target.scope.environment === 'production' && !target.scope.productionAcknowledged) {
        refused.push(
          `Active technique '${t}' refused on production without recorded production acknowledgement.`,
        );
        continue;
      }
    }
    granted.push(t);
  }

  return { allowed: refused.length === 0 && granted.length === requested.length, refused, grantedTechniques: granted };
}

/** Pluggable verification adapter. Implementations perform the real
 *  out-of-band check (DNS lookup, HTTP fetch, OAuth inspection). Tonight's
 *  milestone ships the gate, not network adapters. */
export interface VerificationAdapter {
  method: VerificationMethodType;
  verify(target: Target, artefactRef: string): Promise<Verification>;
}
