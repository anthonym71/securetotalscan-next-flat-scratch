# SecureTotalScan Next (prototype 0.1.0)

Isolated expansion build for SecureTotalScan: the assurance-platform
foundations plus a working design prototype with three switchable design
languages (Orbital / Mission Control / Precision).

**Isolation guarantee: the existing `anthonym71/securetotalscan` repo and
production deployment are untouched. Nothing here deploys anywhere.**

## What this is

- A framework-agnostic core (`core/`) implementing the product's trust
  foundations as real, unit-tested logic:
  - `findings.ts` - evidence-first finding model; confidence is explicit
    (confirmed / suspected / unverified); grading never rewards an
    incomplete scan.
  - `dedupe.ts` - cross-tool dedupe via stable fingerprints (wording- and
    URL-decoration-resistant).
  - `lifecycle.ts` - fix/retest state machine; only a retest verifies a
    fix; regressions reopen; illegal transitions throw.
  - `authorization.ts` - ownership verification model + fail-closed
    testing-scope gate (techniques, rate limits, staging/production,
    explicit production acknowledgement for active testing).
  - `rbac.ts` - viewer / tester / reviewer / admin permission matrix,
    enforced centrally.
  - `evidence.ts` - evidence creation with enforced secret redaction.
  - `monitoring.ts` - scan diffing, config drift detection, regression
    reopening.
  - `service.ts` - the orchestration point where all guards compose.
- A labelled **synthetic** demo dataset (`demo/`). No real target was
  scanned. Hostnames are .example.com; IPs are documentation ranges;
  secrets are fake placeholders.
- A phone-first prototype (`web/`) with three switchable themes over the
  same foundation and data. Animations bind to real state (scan replay,
  finding lifecycle). Reduced motion follows the OS and a manual toggle.
- Docs: `docs/PRD.md`, `docs/ROLLBACK.md`, `docs/SECURITY-LIMITS.md`,
  `docs/LICENSE-INVENTORY.md`.

## What this is NOT (read SECURITY-LIMITS.md)

- Not an operational scanner. The UI runs on the synthetic dataset; the
  real scanner integrations (existing surface scanner, ZAP/Nuclei for
  verified targets) are separate, later milestones.
- Not a full security audit of the existing product, and not a
  certification of anything.
- Not bank-grade, not bulletproof. No product is. See the PRD for the
  honest promise.

## Run it

```bash
npm install
npm test          # core unit tests (13)
npm run build     # core compile + web production build -> dist/
npm run preview   # serve dist/ locally
```

## Provenance

All code here is new, written for this build. Nothing was copied from the
existing production repo or from `dheerajrvanteru/c7-hackathon` (whose
commercial licence terms remain unresolved - see the PRD). The only
carried-over assets are the product name and the design brief.
