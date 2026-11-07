/**
 * SYNTHETIC DEMO DATA - every record here is invented for product review.
 * No real target was scanned. Hostnames use .example.com, IPs are
 * documentation ranges (RFC 5737), secrets are fake-shaped placeholders.
 * The UI labels this data as a demo wherever it appears.
 */

import type { RawFinding } from '../core/dedupe.js';
import type { Target } from '../core/authorization.js';

export const DEMO_LABEL = 'SYNTHETIC DEMO DATA - no real target was scanned';

export const demoTargets: Target[] = [
  {
    id: 't-shop',
    kind: 'url',
    value: 'shop.example.com',
    verification: { status: 'verified', method: 'dns_txt', artefactRef: 'demo-artefact-1', verifiedAt: '2026-11-01T09:00:00Z' },
    scope: {
      techniques: ['passive_headers', 'content_analysis', 'exposed_file_probe', 'crawl', 'dast_baseline', 'dependency_audit', 'secret_scan_history'],
      rateLimitPerMinute: 30,
      allowActive: true,
      environment: 'staging',
    },
  },
  {
    id: 't-api',
    kind: 'url',
    value: 'api.example.com',
    verification: { status: 'verified', method: 'well_known_file', artefactRef: 'demo-artefact-2', verifiedAt: '2026-11-02T09:00:00Z' },
    scope: {
      techniques: ['passive_headers', 'content_analysis', 'dependency_audit'],
      rateLimitPerMinute: 20,
      allowActive: false,
      environment: 'production',
    },
  },
  {
    id: 't-repo',
    kind: 'repo',
    value: 'acme-demo/web-storefront',
    verification: { status: 'verified', method: 'github_oauth', artefactRef: 'demo-artefact-3', verifiedAt: '2026-11-03T09:00:00Z' },
    scope: {
      techniques: ['secret_scan_history', 'dependency_audit'],
      rateLimitPerMinute: 60,
      allowActive: false,
      environment: 'staging',
    },
  },
  {
    id: 't-landing',
    kind: 'url',
    value: 'landing.example.com',
    verification: { status: 'unverified' },
    scope: { techniques: ['passive_headers'], rateLimitPerMinute: 10, allowActive: false, environment: 'production' },
  },
];

const T = '2026-11-06T22:';

export const demoReportsScanA: RawFinding[] = [
  {
    title: 'Missing Content-Security-Policy',
    category: 'headers',
    severity: 'high',
    confidence: 'confirmed',
    asset: { kind: 'url', value: 'https://shop.example.com' },
    evidence: [
      { type: 'http', summary: 'Response headers contain no content-security-policy', detail: 'GET https://shop.example.com/ -> 200; headers listed without CSP', capturedAt: T + '10:00Z', reproduction: 'curl -sI https://shop.example.com/ | grep -i content-security-policy (no output)' },
    ],
    source: 'surface-scanner',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'Missing Content-Security-Policy',
    category: 'headers',
    severity: 'high',
    confidence: 'confirmed',
    asset: { kind: 'url', value: 'https://shop.example.com/' },
    evidence: [
      { type: 'http', summary: 'CSP absent across 4 crawled pages', capturedAt: T + '12:00Z' },
    ],
    source: 'zap-baseline',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'Permissive CORS: Access-Control-Allow-Origin *',
    category: 'cors',
    severity: 'medium',
    confidence: 'confirmed',
    asset: { kind: 'url', value: 'https://api.example.com' },
    evidence: [
      { type: 'http', summary: 'ACAO:* on /v1/products', capturedAt: T + '11:00Z', reproduction: 'curl -sI https://api.example.com/v1/products' },
    ],
    source: 'surface-scanner',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'Exposed .git directory listing',
    category: 'exposed-files',
    severity: 'critical',
    confidence: 'suspected',
    asset: { kind: 'url', value: 'https://landing.example.com' },
    evidence: [
      { type: 'http', summary: 'GET /.git/config returned 200 with 41 bytes', capturedAt: T + '13:00Z', reproduction: 'curl -s https://landing.example.com/.git/config' },
    ],
    source: 'exposed-file-probe',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'Session cookie without Secure and HttpOnly flags',
    category: 'cookies',
    severity: 'high',
    confidence: 'suspected',
    asset: { kind: 'url', value: 'https://shop.example.com' },
    evidence: [
      { type: 'http', summary: 'Set-Cookie: sid=...; Path=/ observed without Secure/HttpOnly', capturedAt: T + '14:00Z' },
    ],
    source: 'zap-baseline',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'Possible hardcoded API key in client bundle',
    category: 'secrets',
    severity: 'high',
    confidence: 'unverified',
    asset: { kind: 'url', value: 'https://shop.example.com' },
    evidence: [
      { type: 'code', summary: 'main.js contains string shaped like an API token', detail: 'token=[REDACTED:generic-secret] (placeholder, not a real key)', capturedAt: T + '15:00Z' },
    ],
    source: 'secrets-scanner',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'lodash 4.17.20 has known CVEs',
    category: 'dependencies',
    severity: 'medium',
    confidence: 'confirmed',
    asset: { kind: 'repo', value: 'acme-demo/web-storefront' },
    evidence: [
      { type: 'code', summary: 'package-lock pins lodash@4.17.20', capturedAt: T + '16:00Z' },
    ],
    source: 'dependency-audit',
    scanId: 'demo-scan-0041',
  },
  {
    title: 'TLS: HSTS max-age below one year',
    category: 'ssl',
    severity: 'low',
    confidence: 'confirmed',
    asset: { kind: 'url', value: 'https://api.example.com' },
    evidence: [
      { type: 'http', summary: 'strict-transport-security: max-age=86400', capturedAt: T + '17:00Z' },
    ],
    source: 'surface-scanner',
    scanId: 'demo-scan-0041',
  },
];

/** Second demo scan: CSP fixed and verified, cookie finding regresses, one new issue. */
export const demoReportsScanB: RawFinding[] = [
  {
    title: 'Permissive CORS: Access-Control-Allow-Origin *',
    category: 'cors',
    severity: 'medium',
    confidence: 'confirmed',
    asset: { kind: 'url', value: 'https://api.example.com' },
    evidence: [{ type: 'http', summary: 'ACAO:* on /v1/products', capturedAt: '2026-11-07T06:11:00Z' }],
    source: 'surface-scanner',
    scanId: 'demo-scan-0042',
  },
  {
    title: 'Session cookie without Secure and HttpOnly flags',
    category: 'cookies',
    severity: 'high',
    confidence: 'suspected',
    asset: { kind: 'url', value: 'https://shop.example.com' },
    evidence: [{ type: 'http', summary: 'Set-Cookie without Secure/HttpOnly observed again', capturedAt: '2026-11-07T06:14:00Z' }],
    source: 'zap-baseline',
    scanId: 'demo-scan-0042',
  },
  {
    title: 'Reflected XSS indicator in search parameter',
    category: 'xss',
    severity: 'critical',
    confidence: 'suspected',
    asset: { kind: 'url', value: 'https://shop.example.com' },
    evidence: [
      { type: 'http', summary: 'Search term reflected unescaped in results page', capturedAt: '2026-11-07T06:18:00Z', reproduction: 'GET /search?q=<svg/onload=1> (safe probe string, no payload executed)' },
    ],
    source: 'zap-baseline',
    scanId: 'demo-scan-0042',
  },
];

export interface DemoRunEvent {
  at: number; // ms offset from run start
  agent: string;
  state: 'running' | 'done' | 'skipped';
  note?: string;
}

/** Deterministic replay of a demo deep-scan run (synthetic). */
export const demoRunEvents: DemoRunEvent[] = [
  { at: 0, agent: 'surface-scanner', state: 'running' },
  { at: 900, agent: 'surface-scanner', state: 'done', note: '8 checks, 4 findings' },
  { at: 900, agent: 'zap-baseline', state: 'running' },
  { at: 2600, agent: 'zap-baseline', state: 'done', note: 'baseline templates, 2 findings' },
  { at: 2600, agent: 'secrets-scanner', state: 'running' },
  { at: 3400, agent: 'secrets-scanner', state: 'done', note: '1 unverified candidate' },
  { at: 3400, agent: 'dependency-audit', state: 'running' },
  { at: 4200, agent: 'dependency-audit', state: 'done', note: '1 vulnerable pin' },
  { at: 4200, agent: 'exposed-file-probe', state: 'running' },
  { at: 5000, agent: 'exposed-file-probe', state: 'done', note: '1 suspected exposure' },
  { at: 5000, agent: 'report-builder', state: 'running' },
  { at: 5600, agent: 'report-builder', state: 'done', note: 'dedupe 8 -> 6, grade computed' },
];
