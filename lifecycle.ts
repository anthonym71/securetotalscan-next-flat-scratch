/**
 * Finding lifecycle state machine. The AI never marks its own homework
 * passed: only a retest event moves a finding to fixed_verified, and a
 * regression reopens it. Illegal transitions throw rather than silently
 * corrupting state.
 */

import type { Finding, FindingStatus, FixProposal } from './findings.js';

export type LifecycleEvent =
  | { type: 'propose_fix'; fix: FixProposal }
  | { type: 'submit_for_retest'; actor: string; at: string }
  | { type: 'retest_passed'; actor: string; at: string; note?: string }
  | { type: 'retest_failed'; actor: string; at: string; note?: string }
  | { type: 'mark_not_verifiable'; actor: string; at: string; reason: string }
  | { type: 'reopen'; actor: string; at: string; reason: string };

export interface HistoryEntry {
  from: FindingStatus;
  to: FindingStatus;
  event: LifecycleEvent['type'];
  actor: string;
  at: string;
  note?: string;
}

const TRANSITIONS: Record<FindingStatus, Partial<Record<LifecycleEvent['type'], FindingStatus>>> = {
  open: {
    propose_fix: 'fix_proposed',
    submit_for_retest: 'awaiting_retest',
    mark_not_verifiable: 'not_verifiable',
  },
  fix_proposed: {
    submit_for_retest: 'awaiting_retest',
    mark_not_verifiable: 'not_verifiable',
  },
  awaiting_retest: {
    retest_passed: 'fixed_verified',
    retest_failed: 'still_exposed',
  },
  still_exposed: {
    propose_fix: 'fix_proposed',
    submit_for_retest: 'awaiting_retest',
    mark_not_verifiable: 'not_verifiable',
  },
  fixed_verified: {
    reopen: 'reopened',
  },
  not_verifiable: {
    reopen: 'reopened',
    submit_for_retest: 'awaiting_retest',
  },
  reopened: {
    propose_fix: 'fix_proposed',
    submit_for_retest: 'awaiting_retest',
    mark_not_verifiable: 'not_verifiable',
  },
};

export function canTransition(from: FindingStatus, eventType: LifecycleEvent['type']): boolean {
  return TRANSITIONS[from][eventType] !== undefined;
}

export interface LifecycleResult {
  finding: Finding;
  entry: HistoryEntry;
}

export function applyEvent(finding: Finding, event: LifecycleEvent): LifecycleResult {
  const to = TRANSITIONS[finding.status][event.type];
  if (!to) {
    throw new Error(
      `Illegal lifecycle transition: cannot '${event.type}' a finding in status '${finding.status}'`,
    );
  }
  const actor =
    'actor' in event ? event.actor : 'proposedBy' in event.fix ? event.fix.proposedBy : 'system';
  const at = 'at' in event ? event.at : event.type === 'propose_fix' ? event.fix.proposedAt : '';
  const note =
    'note' in event ? event.note : 'reason' in event ? event.reason : undefined;
  const next: Finding = { ...finding, status: to };
  if (event.type === 'propose_fix') next.fix = event.fix;
  return { finding: next, entry: { from: finding.status, to, event: event.type, actor, at, note } };
}

/** Regression rule used by monitoring: a fixed finding that reappears in a
 *  later scan reopens instead of silently resurfacing as new. */
export function regressionEvent(actor: string, at: string, scanId: string): LifecycleEvent {
  return { type: 'reopen', actor, at, reason: `Reappeared in scan ${scanId} after being verified fixed.` };
}
