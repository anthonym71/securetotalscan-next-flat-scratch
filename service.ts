/**
 * Application service: the single orchestration point where RBAC, target
 * authorisation, dedupe, lifecycle and monitoring compose. The UI and demo
 * talk to this; nothing mutates state without the relevant guard passing.
 */

import type { Finding, FixProposal } from './findings.js';
import { dedupe, type RawFinding } from './dedupe.js';
import { applyEvent, type HistoryEntry } from './lifecycle.js';
import { authoriseScan, type Target, type Technique } from './authorization.js';
import { requirePerm, type Role } from './rbac.js';
import { diffScans, type ScanDiff } from './monitoring.js';

export interface Actor {
  id: string;
  role: Role;
}

export interface AuditEntry {
  at: string;
  actorId: string;
  action: string;
  detail: string;
}

export class AssuranceService {
  private findings = new Map<string, Finding>();
  private targets = new Map<string, Target>();
  readonly auditLog: AuditEntry[] = [];
  readonly history: HistoryEntry[] = [];

  private log(actorId: string, action: string, detail: string): void {
    this.auditLog.push({ at: new Date().toISOString(), actorId, action, detail });
  }

  registerTarget(actor: Actor, target: Target): void {
    requirePerm(actor.role, 'target:manage');
    this.targets.set(target.id, target);
    this.log(actor.id, 'target:register', `${target.kind}:${target.value}`);
  }

  /** Bootstrap-friendly path for seed/demo data where no admin actor exists. */
  registerTargetSystem(target: Target): void {
    this.targets.set(target.id, target);
    this.log('system', 'target:register', `${target.kind}:${target.value}`);
  }

  getTarget(id: string): Target | undefined {
    return this.targets.get(id);
  }

  /** Ingest raw tool reports for a target. Guards: scan:run permission and
   *  the target authorisation gate for the techniques the reports claim. */
  ingestScan(
    actor: Actor,
    targetId: string,
    reports: RawFinding[],
    techniques: Technique[],
    scanId: string,
  ): { accepted: number; refused: string[] } {
    requirePerm(actor.role, 'scan:run');
    const target = this.targets.get(targetId);
    if (!target) throw new Error(`Unknown target '${targetId}'`);
    const decision = authoriseScan(target, techniques);
    if (!decision.allowed) {
      this.log(actor.id, 'scan:refused', decision.refused.join(' | '));
      return { accepted: 0, refused: decision.refused };
    }
    const { findings } = dedupe(reports);
    let accepted = 0;
    for (const f of findings) {
      const existing = this.findings.get(f.fingerprint);
      if (existing) {
        const merged = dedupe([
          ...reports.filter((r) => existing.sources.includes(r.source)),
        ]);
        void merged;
        this.findings.set(f.fingerprint, {
          ...f,
          id: existing.id,
          sources: Array.from(new Set([...existing.sources, ...f.sources])).sort(),
          evidence: [...existing.evidence, ...f.evidence].filter(
            (e, i, arr) => arr.findIndex((x) => x.type + x.summary === e.type + e.summary) === i,
          ),
          firstSeenScanId: existing.firstSeenScanId,
          status: existing.status,
          fix: existing.fix,
        });
      } else {
        this.findings.set(f.fingerprint, f);
      }
      accepted++;
    }
    this.log(actor.id, 'scan:ingest', `scan=${scanId} target=${targetId} findings=${accepted}`);
    return { accepted, refused: [] };
  }

  listFindings(): Finding[] {
    return Array.from(this.findings.values());
  }

  getFinding(fingerprint: string): Finding | undefined {
    return this.findings.get(fingerprint);
  }

  proposeFix(actor: Actor, fingerprint: string, fix: FixProposal): void {
    requirePerm(actor.role, 'finding:propose_fix');
    const f = this.mustGet(fingerprint);
    const { finding, entry } = applyEvent(f, { type: 'propose_fix', fix });
    this.findings.set(fingerprint, finding);
    this.history.push(entry);
    this.log(actor.id, 'finding:propose_fix', fingerprint);
  }

  submitForRetest(actor: Actor, fingerprint: string, at: string): void {
    requirePerm(actor.role, 'finding:propose_fix');
    const f = this.mustGet(fingerprint);
    const { finding, entry } = applyEvent(f, { type: 'submit_for_retest', actor: actor.id, at });
    this.findings.set(fingerprint, finding);
    this.history.push(entry);
    this.log(actor.id, 'finding:submit_retest', fingerprint);
  }

  recordRetest(actor: Actor, fingerprint: string, passed: boolean, at: string, note?: string): void {
    requirePerm(actor.role, 'finding:verify');
    const f = this.mustGet(fingerprint);
    const { finding, entry } = applyEvent(f, {
      type: passed ? 'retest_passed' : 'retest_failed',
      actor: actor.id,
      at,
      note,
    });
    this.findings.set(fingerprint, finding);
    this.history.push(entry);
    this.log(actor.id, passed ? 'finding:retest_passed' : 'finding:retest_failed', fingerprint);
  }

  /** Approvals outstanding: findings sitting in states that need a human. */
  pendingApprovals(): Finding[] {
    return this.listFindings().filter(
      (f) => f.status === 'awaiting_retest' || f.status === 'fix_proposed',
    );
  }

  diffWithPrevious(previous: Finding[], at: string, scanId: string): ScanDiff {
    return diffScans(previous, this.listFindings(), at, scanId);
  }

  private mustGet(fingerprint: string): Finding {
    const f = this.findings.get(fingerprint);
    if (!f) throw new Error(`Unknown finding '${fingerprint}'`);
    return f;
  }
}
