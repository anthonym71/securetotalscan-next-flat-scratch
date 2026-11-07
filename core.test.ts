import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupe, fingerprint } from '../core/dedupe.js';
import { gradeFindings, type Finding } from '../core/findings.js';
import { applyEvent } from '../core/lifecycle.js';
import { authoriseScan, type Target } from '../core/authorization.js';
import { can, requirePerm as require, ForbiddenError } from '../core/rbac.js';
import { redactSecrets, makeEvidence } from '../core/evidence.js';
import { diffScans, diffConfig } from '../core/monitoring.js';
import { AssuranceService, type Actor } from '../core/service.js';

const base = {
  title: 'Missing Content-Security-Policy',
  category: 'headers',
  severity: 'high' as const,
  confidence: 'confirmed' as const,
  asset: { kind: 'url' as const, value: 'https://demo-app.example.com' },
  evidence: [{ type: 'http' as const, summary: 'No CSP header in response', capturedAt: '2026-11-07T00:00:00Z' }],
  source: 'surface-scanner',
  scanId: 'scan-1',
};

test('fingerprint is stable across wording and URL decoration', () => {
  const a = fingerprint(base);
  const b = fingerprint({ ...base, title: 'Missing  Content-Security-Policy!', asset: { kind: 'url', value: 'https://demo-app.example.com/?utm=x#frag' } });
  assert.equal(a, b);
});

test('dedupe merges two tools reporting the same issue', () => {
  const { findings, mergedCount } = dedupe([
    base,
    { ...base, source: 'zap-baseline', evidence: [{ type: 'http', summary: 'CSP absent', capturedAt: '2026-11-07T00:01:00Z' }] },
    { ...base, title: 'Different issue entirely', category: 'cors', source: 'zap-baseline' },
  ]);
  assert.equal(findings.length, 2);
  assert.equal(mergedCount, 1);
  const merged = findings.find((f) => f.category === 'headers')!;
  assert.deepEqual(merged.sources, ['surface-scanner', 'zap-baseline']);
  assert.equal(merged.evidence.length, 2);
});

test('confidence escalates to confirmed when any tool confirms', () => {
  const { findings } = dedupe([
    { ...base, confidence: 'unverified' },
    { ...base, source: 'manual-review', confidence: 'confirmed' },
  ]);
  assert.equal(findings[0].confidence, 'confirmed');
});

test('gradeFindings never passes an incomplete scan', () => {
  const g = gradeFindings([], false);
  assert.equal(g.grade, 'INCOMPLETE');
  const g2 = gradeFindings([], true);
  assert.equal(g2.grade, 'A');
});

function mkFinding(status: Finding['status'] = 'open'): Finding {
  const { findings } = dedupe([base]);
  return { ...findings[0], status };
}

test('lifecycle enforces legal transitions', () => {
  const f = mkFinding();
  const { finding: proposed } = applyEvent(f, {
    type: 'propose_fix',
    fix: { summary: 'Add CSP header', proposedBy: 'agent', proposedAt: '2026-11-07T01:00:00Z' },
  });
  assert.equal(proposed.status, 'fix_proposed');
  assert.throws(() => applyEvent(proposed, { type: 'retest_passed', actor: 'r', at: '2026-11-07T01:01:00Z' }), /Illegal lifecycle transition/);
  const { finding: awaiting } = applyEvent(proposed, { type: 'submit_for_retest', actor: 'r', at: '2026-11-07T01:02:00Z' });
  const { finding: verified } = applyEvent(awaiting, { type: 'retest_passed', actor: 'reviewer-1', at: '2026-11-07T01:03:00Z' });
  assert.equal(verified.status, 'fixed_verified');
  const { finding: reopened } = applyEvent(verified, { type: 'reopen', actor: 'monitoring', at: '2026-11-08T00:00:00Z', reason: 'regressed' });
  assert.equal(reopened.status, 'reopened');
});

const verifiedStaging: Target = {
  id: 't1',
  kind: 'url',
  value: 'staging.demo-app.example.com',
  verification: { status: 'verified', method: 'dns_txt', verifiedAt: '2026-11-01T00:00:00Z' },
  scope: { techniques: ['passive_headers', 'dast_baseline'], rateLimitPerMinute: 30, allowActive: true, environment: 'staging' },
};

test('authorisation gate is fail-closed', () => {
  assert.equal(authoriseScan(verifiedStaging, ['passive_headers', 'dast_baseline']).allowed, true);
  const unverified = { ...verifiedStaging, verification: { status: 'unverified' as const } };
  const d1 = authoriseScan(unverified, ['passive_headers']);
  assert.equal(d1.allowed, false);
  assert.match(d1.refused[0], /unverified/);
  const d2 = authoriseScan(verifiedStaging, ['dast_authenticated']);
  assert.equal(d2.allowed, false);
  const expired = { ...verifiedStaging, scope: { ...verifiedStaging.scope, expiresAt: '2020-01-01T00:00:00Z' } };
  assert.equal(authoriseScan(expired, ['passive_headers'], new Date('2026-11-07')).allowed, false);
});

test('production active testing needs explicit acknowledgement', () => {
  const prod: Target = { ...verifiedStaging, scope: { ...verifiedStaging.scope, environment: 'production' } };
  assert.equal(authoriseScan(prod, ['dast_baseline']).allowed, false);
  const prodAck: Target = { ...prod, scope: { ...prod.scope, productionAcknowledged: true } };
  assert.equal(authoriseScan(prodAck, ['dast_baseline']).allowed, true);
});

test('rbac matrix', () => {
  assert.equal(can('viewer', 'scan:run'), false);
  assert.equal(can('tester', 'scan:active'), false);
  assert.equal(can('reviewer', 'finding:verify'), true);
  assert.equal(can('admin', 'target:manage'), true);
  assert.throws(() => require('viewer', 'scan:run'), ForbiddenError);
});

test('redaction masks real-shaped secrets', () => {
  const awsEx = 'AKIA' + 'IOSFODNN7EXAM' + 'PLE';
  const stripeEx = 'sk' + '_live_4eC39HqLyjW' + 'DarjtT1zdp7dc';
  const slackEx = 'https://hooks.slack.com/services/' + 'T000/B000/XXXX';
  const s = redactSecrets(`key is ${awsEx} and ${stripeEx} and ${slackEx}`);
  assert.equal(s.includes(awsEx), false);
  assert.equal(s.includes('sk' + '_live_'), false);
  assert.equal(s.includes('T000/B000'), false);
  const ev = makeEvidence('http', 'token=' + ('ghp_' + 'abcdefghijklmnopqrst' + 'uvwxyz123456') + ' leaked', '2026-11-07T00:00:00Z');
  assert.equal(ev.summary.includes('ghp' + '_'), false);
});

test('diffScans reopens regressed fixed findings', () => {
  const fixed = { ...mkFinding('fixed_verified') };
  const again = { ...mkFinding('open'), lastSeenScanId: 'scan-2' };
  const diff = diffScans([fixed], [again], '2026-11-08T00:00:00Z', 'scan-2');
  assert.equal(diff.regressed.length, 1);
  assert.equal(diff.regressed[0].status, 'reopened');
});

test('diffScans separates added/missing/persistent', () => {
  const a = mkFinding();
  const b = { ...mkFinding(), fingerprint: 'fp-b', title: 'B', lastSeenScanId: 'scan-2' };
  const c = { ...mkFinding(), fingerprint: 'fp-c', title: 'C', lastSeenScanId: 'scan-2' };
  const diff = diffScans([a, b], [a, c], '2026-11-08T00:00:00Z', 'scan-2');
  assert.equal(diff.persistent.length, 1);
  assert.equal(diff.added[0].fingerprint, 'fp-c');
  assert.equal(diff.missing[0].fingerprint, 'fp-b');
});

test('diffConfig detects drift', () => {
  const changes = diffConfig({ csp: "default-src 'self'", debug: false }, { csp: 'none', debug: true });
  assert.equal(changes.length, 2);
});

test('service enforces guards end to end', () => {
  const svc = new AssuranceService();
  const admin: Actor = { id: 'anthony', role: 'admin' };
  const viewer: Actor = { id: 'guest', role: 'viewer' };
  svc.registerTarget(admin, verifiedStaging);
  assert.throws(() => svc.registerTarget(viewer, verifiedStaging), ForbiddenError);
  const refused = svc.ingestScan(admin, 't1', [base], ['dast_authenticated'], 'scan-x');
  assert.equal(refused.accepted, 0);
  assert.ok(refused.refused.length > 0);
  const ok = svc.ingestScan(admin, 't1', [base], ['passive_headers'], 'scan-1');
  assert.equal(ok.accepted, 1);
  const f = svc.listFindings()[0];
  svc.proposeFix(admin, f.fingerprint, { summary: 'Add CSP', proposedBy: 'agent', proposedAt: '2026-11-07T01:00:00Z' });
  svc.submitForRetest(admin, f.fingerprint, '2026-11-07T01:05:00Z');
  assert.equal(svc.pendingApprovals().length, 1);
  svc.recordRetest(admin, f.fingerprint, true, '2026-11-07T01:10:00Z');
  assert.equal(svc.getFinding(f.fingerprint)!.status, 'fixed_verified');
  assert.equal(svc.pendingApprovals().length, 0);
  assert.ok(svc.auditLog.length >= 4);
});
