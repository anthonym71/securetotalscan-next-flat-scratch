/*
 * ⚠ IN-MEMORY DEMO CONTROL - NOT PRODUCTION RBAC.
 * This matrix lives in process memory and guards the demo service only. A
 * production deployment needs server-side authn/authz (session/OIDC +
 * per-request permission checks against a real store). Do not present this
 * as implemented production access control.
*
 * Role-based access control. Enforcement lives in one place (require) so no
 * caller can "forget" a check. Roles are deliberately few; permissions are
 * explicit. Nothing here is decorative - every mutating path in the app
 * service goes through require().
 */

export type Role = 'viewer' | 'tester' | 'reviewer' | 'admin';

export type Permission =
  | 'scan:run'          // run passive/non-intrusive scans
  | 'scan:active'       // run authorised active testing (verified targets only)
  | 'finding:propose_fix'
  | 'finding:verify'    // mark retest results (reviewer judgment)
  | 'finding:not_verifiable'
  | 'target:verify'     // confirm ownership/authorisation artefacts
  | 'target:manage'     // change scope, environments, expiry
  | 'audit:read'
  | 'member:manage';

const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  viewer: new Set([]),
  tester: new Set(['scan:run', 'finding:propose_fix']),
  reviewer: new Set([
    'scan:run',
    'scan:active',
    'finding:propose_fix',
    'finding:verify',
    'finding:not_verifiable',
    'audit:read',
  ]),
  admin: new Set([
    'scan:run',
    'scan:active',
    'finding:propose_fix',
    'finding:verify',
    'finding:not_verifiable',
    'target:verify',
    'target:manage',
    'audit:read',
    'member:manage',
  ]),
};

export class ForbiddenError extends Error {
  constructor(
    public readonly role: Role,
    public readonly permission: Permission,
  ) {
    super(`Role '${role}' lacks permission '${permission}'`);
    this.name = 'ForbiddenError';
  }
}

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role].has(permission);
}

export function requirePerm(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(role, permission);
}

export function permissionsFor(role: Role): Permission[] {
  return Array.from(MATRIX[role]);
}
