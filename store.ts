/**
 * Demo store: one AssuranceService instance seeded with the SYNTHETIC demo
 * dataset. All state transitions (fix proposals, retests, approvals) run
 * through the real core modules - the UI never mutates findings directly.
 */
import { AssuranceService, type Actor } from '../../../core/service';
import {
  demoTargets,
  demoReportsScanA,
  demoReportsScanB,
  demoRunEvents,
  DEMO_LABEL,
} from '../../../demo/dataset';
import type { Finding } from '../../../core/findings';

export type ThemeId = 'orbital' | 'mission' | 'precision';

export const THEMES: { id: ThemeId; name: string; blurb: string }[] = [
  { id: 'orbital', name: 'Orbital', blurb: 'Spatial asset map. Exposures attach to the systems they affect.' },
  { id: 'mission', name: 'Mission Control', blurb: 'Live ops console. Pipeline, queue and remediation timeline.' },
  { id: 'precision', name: 'Precision', blurb: 'Quiet, audit-grade reading surface for clients and reviewers.' },
];

export const demoActorAdmin: Actor = { id: 'demo-admin', role: 'admin' };
export const demoActorReviewer: Actor = { id: 'demo-reviewer', role: 'reviewer' };

export function buildSeededService(): AssuranceService {
  const svc = new AssuranceService();
  for (const t of demoTargets) svc.registerTargetSystem(t);
  svc.ingestScan(
    demoActorAdmin,
    't-shop',
    demoReportsScanA.filter((r) => r.asset.value.includes('shop.example.com')),
    ['passive_headers', 'content_analysis', 'exposed_file_probe', 'dast_baseline'],
    'demo-scan-0041',
  );
  svc.ingestScan(
    demoActorAdmin,
    't-api',
    demoReportsScanA.filter((r) => r.asset.value.includes('api.example.com')),
    ['passive_headers', 'content_analysis', 'dependency_audit'],
    'demo-scan-0041',
  );
  svc.ingestScan(
    demoActorAdmin,
    't-repo',
    demoReportsScanA.filter((r) => r.asset.kind === 'repo'),
    ['dependency_audit', 'secret_scan_history'],
    'demo-scan-0041',
  );
  // The .git exposure sits on an UNVERIFIED target: the gate must refuse it.
  svc.ingestScan(
    demoActorAdmin,
    't-landing',
    demoReportsScanA.filter((r) => r.asset.value.includes('landing.example.com')),
    ['exposed_file_probe'],
    'demo-scan-0041',
  );
  return svc;
}

export function buildSecondScanService(svc: AssuranceService): void {
  svc.ingestScan(
    demoActorAdmin,
    't-shop',
    demoReportsScanB.filter((r) => r.asset.value.includes('shop.example.com')),
    ['passive_headers', 'dast_baseline'],
    'demo-scan-0042',
  );
  svc.ingestScan(
    demoActorAdmin,
    't-api',
    demoReportsScanB.filter((r) => r.asset.value.includes('api.example.com')),
    ['passive_headers'],
    'demo-scan-0042',
  );
}

export { demoRunEvents, DEMO_LABEL };
export type { Finding };
