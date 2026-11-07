# PRD - SecureTotalScan Next (assurance platform expansion)

Status: prototype 0.1.0 (overnight milestone) · Owner: Anthony Mallett ·
Date: 2026-11-07


## Product tiers (direction - commercial details TBD)

Two materially different offerings, not one product at two prices:

**Entry assessment (~$50 current price point).** What the current site sells today,
kept honest: an automated, non-intrusive (GET-only) surface assessment with a clear
report. Billing cadence and packaging are TBD. This build does not change the live
offering or its checkout.

**Premium assessment (minimum $2,000 per assessment).** A scoped engagement, not a
bigger scan: agreed target scope and authorisation up front (the fail-closed gate in
`core/authorization.ts` is the enforcement point), validated evidence for every
finding (confidence levels, reproduction steps, redaction), a concrete fix plan, a
retest that verifies each fix, and expert human review before delivery. The
findings/lifecycle/monitoring modules and the Evidence / Fix / Retest flow in this
prototype are the working foundation for that workflow.

Explicitly not claimed: that either tier replaces an enterprise programme or a
$50k-$100k consultancy engagement. No "bulletproof" claims at any tier.

## 1. Product thesis

SecureTotalScan becomes a security **assurance** platform for AI-built
websites, SaaS products and agencies:

**Find with evidence -> prioritise -> fix -> verify by retest -> keep watching.**

The moat is the quality of evidence and verified fixes, not the number of
scanners. We never sell "unpenetrable" or "hack-proof": no product can
deliver that, and claiming it is a liability. The claimable promise:
*provably tested, fixed, retested and continuously watched - with the
evidence to show for it.*

## 2. What exists today (verified 2026-11-07)

Marketing site + free surface scan (headers, secrets, CORS, TLS, exposed
files, DB exposure; A-F grade), paid deep-agent dashboard (7 LangGraph
agents), pricing Free/$9 report/$49 Pro/$99 Business/custom Org.
Strong engineering base: SSRF guards, fail-closed rate limiting, HMAC
sessions, gitleaks CI, self security review (2026-09-27).
Open issues: upstream backend commercial licence unresolved; Slack
webhook in public git history (revocation unconfirmed); no backend
lockfile; copy inconsistencies (five vs seven agents; waitlist buttons).

## 3. This milestone (built)

| Area | Delivered | Verified by |
|---|---|---|
| Evidence-first finding model | core/findings.ts | unit tests |
| Cross-tool dedupe | core/dedupe.ts | unit tests |
| Fix/retest lifecycle | core/lifecycle.ts | unit tests |
| Ownership verification + scope gate | core/authorization.ts | unit tests |
| RBAC (viewer/tester/reviewer/admin) | core/rbac.ts | unit tests |
| Secret-redacting evidence store | core/evidence.ts | unit tests |
| Rescan diff/drift/regression engine | core/monitoring.ts | unit tests |
| Guard composition + audit log | core/service.ts | unit tests |
| Three design languages (Orbital / Mission Control / Precision) | web/ | rendered screenshots |
| Phone-first UX: one finding per page, Evidence/Fix/Retest swipe views, Back everywhere, approvals pill | web/ | rendered screenshots |
| Reduced motion (OS + manual) | web/ | rendered screenshots |
| Synthetic demo run replay driving real UI state | demo/ | rendered screenshots |

## 4. Next milestones (not built tonight)

- M1: real verification adapters (DNS TXT, .well-known, GitHub OAuth);
  wire the EXISTING original surface scanner (lib/scanner is original
  work) behind the gate.
- M2: authorised active DAST for verified targets (ZAP Apache-2.0,
  Nuclei MIT), isolated workers, rate limits, stop button, audit trail.
- M3: continuous monitoring productised (scheduled rescans, alerts,
  trust pages), compliance evidence packs (SOC 2 / ISO 27001 / NIST CSF
  mappings - evidence, never certification).
- M4: agency controls hardening (tenant isolation, retention, redaction
  policies), client reporting.
- M5: production design rollout of the winning theme after Anthony's
  review; audience testing afterwards.

## 5. Upstream licence decision (BLOCKING for commercialisation)

The existing backend agent engine derives from
`dheerajrvanteru/c7-hackathon`, which has NO licence file. The only
record of permission is our own ATTRIBUTION.md (self-asserted,
hackathon-scope). Options: (a) obtain written commercial consent from
the author; (b) replace the engine. This repo's core is engine-agnostic
and can serve as the seed for (b). Nothing here is commercially cleared
until that is resolved.

## 6. Non-goals (permanent)

Unrestricted attacks on arbitrary websites, credential theft, stealth
persistence, destructive testing, "black hat ops". Restricted access
does not make those safe; attacker behaviour is reproduced in authorised
labs only.

## 7. Design principles

Animations represent real activity only (discovered endpoints, checks
completing, findings moving through review/retest). No fake threat
counters, flashing maps or invented live attacks; demo data is always
labelled. Phone-first; one finding at a time; Back everywhere; approvals
always visible. Reduced motion is first-class.
