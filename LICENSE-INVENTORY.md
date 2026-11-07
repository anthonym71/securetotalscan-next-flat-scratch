# Dependency licence inventory

Verified from each project's LICENSE file on 2026-11-07.

## Runtime/build dependencies of THIS repo

| Package | Version | Licence | Notes |
|---|---|---|---|
| react / react-dom | ^18.3 | MIT | UI |
| vite | ^5.4 | MIT | build tool |
| @vitejs/plugin-react | ^4.3 | MIT | build plugin |
| typescript | ^5.6 | Apache-2.0 | compiler |
| @types/* | - | MIT | types |

## Tools referenced by the roadmap (not dependencies of this repo)

| Tool | Licence | Commercial SaaS use |
|---|---|---|
| OWASP ZAP | Apache-2.0 | OK (verified zaproxy/zaproxy LICENSE) |
| Nuclei | MIT | OK (verified projectdiscovery/nuclei LICENSE.md) |
| Trivy | Apache-2.0 | OK (verified aquasecurity/trivy LICENSE) |
| Gitleaks | MIT | OK (verified gitleaks/gitleaks LICENSE) |
| osv-scanner | Apache-2.0 | OK (verified google/osv-scanner LICENSE) |
| Semgrep engine | LGPL-2.1 | CLI use OK |
| Semgrep Registry rules | Semgrep Rules License v1.0 | NOT OK to offer as a service ("internal business purposes only... does not allow you to distribute the rules, or to make them available to others as a service" - semgrep.dev/legal/rules-license). Needs own rules or a Semgrep commercial agreement. |
| Burp Suite Professional | Proprietary, $499/yr | Optional manual-validation tool (portswigger.net/burp/pro.html) |

## Upstream code NOT in this repo

`dheerajrvanteru/c7-hackathon`: no licence file found; commercial terms
unresolved. See PRD section 5. No code from it exists in this repo.
