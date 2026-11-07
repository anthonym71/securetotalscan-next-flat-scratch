import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprint } from '../core/dedupe.js';
import { authoriseScan, type Target } from '../core/authorization.js';
import { applyEvent } from '../core/lifecycle.js';
import { dedupe } from '../core/dedupe.js';
import { redactSecrets } from '../core/evidence.js';
import { requirePerm, ForbiddenError } from '../core/rbac.js';
import { AssuranceService, type Actor } from '../core/service.js';

const asset = { kind: 'url' as const, value: 'https://shop.example.com' };
const raw = {
  title: 'Missing Content-Security-Policy',
  category: 'headers',
  severity: 'high' as const,
  confidence: 'confirmed' as const,
  asset,
  evidence: [{ type: 'http' as const, summary: 'no CSP', capturedAt: '2026-11-07T00:00:00Z' }],
  source: 'surface-scanner',
  scanId: 's1',
};

function mkTarget(over: Partial<Target> = {}): Target {
  return {
    id: 't1',
    kind: 'url',
    value: 'https://shop.example.com',
    verification: { status: 'verified', method: 'dns_txt', verifiedAt: '2026-11-01T00:00:00Z' },
    scope: {
      techniques: ['passive_headers', 'dast_baseline'],
      rateLimitPerMinute: 30,
      allowActive: true,
      environment: 'staging',
    },
    ...over,
  };
}

// --- Asset identity: URL normalisation and redirect-style decoration ---

test('redirect-style URL decoration does not change asset identity', () => {
  const a = fingerprint(raw);
  assert.equal(a, fingerprint({ ...raw, asset: { kind: 'url', value: 'http://shop.example.com/' } }));
  assert.equal(a, fingerprint({ ...raw, asset: { kind: 'url', value: 'HTTPS://SHOP.example.com/?next=/login#frag' } }));
});

test('a different host is never the same asset (no cross-target bleed)', () => {
  const a = fingerprint(raw);
  assert.notEqual(a, fingerprint({ ...raw, asset: { kind: 'url', value: 'https://api.example.com' } }));
  assert.notEqual(a, fingerprint({ ...raw, asset: { kind: 'url', value: 'https://shop.example.com.evil.example' } }));
});

// --- Authorisation gate: expired grants ---

test('expired target verification is refused, including at the exact expiry instant', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const t = mkTarget({ verification: { status: 'verified', expiresAt: '2026-11-06T00:00:00Z' } });
  const d = authoriseScan(t, ['passive_headers'], now);
  assert.equal(d.allowed, false);
  assert.ok(d.refused.some((r) => /expired/i.test(r)));
  const atInstant = mkTarget({ verification: { status: 'verified', expiresAt: '2026-11-07T12:00:00Z' } });
  assert.equal(authoriseScan(atInstant, ['passive_headers'], now).allowed, false);
});

test('expired testing scope is refused even with valid verification', () => {
  const now = new Date('2026-11-07T12:00:00Z');
  const t = mkTarget({ scope: { ...mkTarget().scope, expiresAt: '2026-11-01T00:00:00Z' } });
  const d = authoriseScan(t, ['passive_headers'], now);
  assert.equal(d.allowed, false);
  assert.ok(d.refused.some((r) => /scope has expired/i.test(r)));
});

test('unverified target is refused for every technique (fail-closed)', () => {
  const t = mkTarget({ verification: { status: 'unverified' } });
  const d = authoriseScan(t, ['passive_headers']);
  assert.equal(d.allowed, false);
  assert.equal(d.grantedTechniques.length, 0);
});

test('active technique on production without acknowledgement is refused', () => {
  const t = mkTarget({ scope: { ...mkTarget().scope, environment: 'production' } });
  const d = authoriseScan(t, ['dast_baseline']);
  assert.equal(d.allowed, false);
  assert.ok(d.refused.some((r) => /production acknowledgement/i.test(r)));
});

// --- Tenant separation ---

test('service instances do not share findings, targets or audit logs', () => {
  const admin: Actor = { id: 'tenant-a-admin', role: 'admin' };
  const a = new AssuranceService();
  const b = new AssuranceService();
  a.registerTarget(admin, mkTarget());
  assert.notEqual(a.getTarget('t1'), undefined);
  assert.equal(b.getTarget('t1'), undefined);
  assert.equal(b.listFindings().length, 0);
  assert.equal(b.auditLog.length, 0);
  // NOTE: in-memory demo separation only. Production multi-tenancy needs a
  // real store with tenant keys on every row; see docs/SECURITY-LIMITS.md.
});

test('a viewer cannot register targets or mutate state', () => {
  const svc = new AssuranceService();
  const viewer: Actor = { id: 'viewer-1', role: 'viewer' };
  assert.throws(() => svc.registerTarget(viewer, mkTarget()), ForbiddenError);
  assert.equal(svc.getTarget('t1'), undefined);
});

// --- Lifecycle: nobody can self-declare a fix verified ---

function openFinding() {
  const { findings } = dedupe([raw]);
  return { ...findings[0], status: 'open' as const };
}

test('an open finding cannot jump straight to fixed_verified', () => {
  const f = openFinding();
  assert.throws(() =>
    applyEvent(f, { type: 'retest_passed', actor: 'dev-1', at: '2026-11-07T01:00:00Z' }),
    /Illegal lifecycle transition/);
});

test('a proposed fix cannot mark itself verified without a retest', () => {
  const f = openFinding();
  const proposed = applyEvent(f, {
    type: 'propose_fix',
    fix: { summary: 'add CSP header', proposedBy: 'dev-1', proposedAt: '2026-11-07T01:00:00Z' },
  }).finding;
  assert.equal(proposed.status, 'fix_proposed');
  assert.throws(() =>
    applyEvent(proposed, { type: 'retest_passed', actor: 'dev-1', at: '2026-11-07T02:00:00Z' }),
    /Illegal lifecycle transition/);
  // the only route to verified: submit for retest, then retest passes
  const awaiting = applyEvent(proposed, { type: 'submit_for_retest', actor: 'dev-1', at: '2026-11-07T02:30:00Z' }).finding;
  const verified = applyEvent(awaiting, { type: 'retest_passed', actor: 'reviewer-1', at: '2026-11-07T03:00:00Z' }).finding;
  assert.equal(verified.status, 'fixed_verified');
});

// --- Evidence redaction ---

test('redaction covers keys, tokens, webhooks and bearer headers', () => {
  // Fixtures are concatenated at runtime so secret scanners do not match
  // key-shaped literals in this repo; the runtime strings are unchanged.
  const awsKey = 'AKIA' + 'IOSFODNN7EXAM' + 'PLE';
  const ghTok = 'ghp_' + 'abcdefghijklmnopqrst' + 'uvwxyz123456';
  const stripeKey = 'sk' + '_live_4eC39HqLyjW' + 'DarjtT1zdp7dc';
  const slackHook = 'https://hooks.slack.com/services/' + 'T000/B000/XXXX';
  const bearer = 'Bearer eyJhbGciOiJIUzI1NiJ9' + '.payload.sig';
  const dirty = [
    awsKey,
    'token ' + ghTok,
    stripeKey,
    slackHook,
    'Authorization: ' + bearer,
    'api_key: "supersecretvalue1"',
  ].join('\n');
  const clean = redactSecrets(dirty);
  assert.ok(!clean.includes(awsKey));
  assert.ok(!clean.includes(ghTok));
  assert.ok(!clean.includes(stripeKey));
  assert.ok(!clean.includes('T000/B000'));
  assert.ok(!clean.includes(bearer.split(' ')[1]));
  assert.ok(!clean.includes('supersecretvalue1'));
  assert.ok(/REDACTED/.test(clean));
});

test('redaction leaves ordinary text untouched', () => {
  const s = 'GET https://shop.example.com/ -> 200; headers listed without CSP';
  assert.equal(redactSecrets(s), s);
});

// --- RBAC (in-memory demo control, NOT production authorisation) ---

test('role guards throw ForbiddenError on missing permission', () => {
  assert.throws(() => requirePerm('viewer', 'target:manage'), ForbiddenError);
  assert.throws(() => requirePerm('tester', 'member:manage'), ForbiddenError);
});
