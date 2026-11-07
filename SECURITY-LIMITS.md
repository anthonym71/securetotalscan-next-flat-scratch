# Security limits and honest coverage

## Scope of tonight's verification

- Unit-tested: dedupe identity, lifecycle transitions, authorisation gate
  (unverified/expired/out-of-scope/production-ack), RBAC matrix, secret
  redaction, scan diffing/regression, config drift, service guard
  composition. 13 tests, all passing.
- Build-verified: TypeScript strict compile of core and web; Vite
  production build.
- Visually verified: rendered UI screens captured from the built app.

## Explicitly NOT done

- No live scanning of any target. No network attack, probe, crawl or
  exploit testing was performed or is wired to run. The demo event stream
  is synthetic and labelled.
- No full code audit of the EXISTING product (that was a separate
  review-sample earlier; the Sept 27 self-review covers its scope only).
- No third-party security review, benchmark testing or accuracy
  validation of scanner output. Integrating a scanner is not proof its
  findings are accurate.
- Verification adapters (DNS TXT, .well-known, GitHub OAuth) are
  interfaces; network implementations are a later milestone.
- The redactor is regex-based defence-in-depth, not a guarantee. Never
  place real secrets in demo data, tickets or chat.

## Legal/contract boundary (carried from the review)

- Active testing runs only behind verified ownership AND an explicit
  scope; production active testing additionally needs a recorded
  production acknowledgement. This is enforced in `authorization.ts`.
- Owning a domain does not automatically authorise testing the hosting
  provider or connected third parties; scope-specific checks remain
  required (UK Computer Misuse Act 1990; Ireland's Criminal Justice
  (Offences Relating to Information Systems) Act 2017; US CFAA; provider
  contracts).
- The inherited backend in the EXISTING repo has unresolved commercial
  licence terms (see PRD). This repo contains none of that code.


## Access control and tenancy status

- `core/rbac.ts` is an in-memory demo guard, not production RBAC. Production
  needs server-side authentication and per-request authorisation against a
  real store.
- Tenant separation in this prototype is per-service-instance in memory.
  Production multi-tenancy needs tenant keys on every row and enforced query
  scoping; that is designed for but NOT implemented here.
- The authorisation gate (`core/authorization.ts`) is fail-closed: an
  unverified, expired or out-of-scope target grants zero techniques. Network
  verification adapters (DNS TXT, well-known file) are interfaces only -
  they are not implemented, so no live ownership check happens tonight.
