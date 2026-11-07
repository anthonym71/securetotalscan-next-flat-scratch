import React, { useContext, useRef, useState } from 'react';
import { Ctx } from '../App';
import { SeverityChip, ConfidenceChip, StatusChip } from '../components/Chips';
import { demoActorAdmin, demoActorReviewer } from '../state/store';

const TABS = ['Evidence', 'Fix', 'Retest'] as const;
type Tab = (typeof TABS)[number];

export function FindingDetail({ fingerprint }: { fingerprint: string }) {
  const { state, refresh } = useContext(Ctx);
  const f = state.svc.getFinding(fingerprint);
  const [tab, setTab] = useState<Tab>('Evidence');
  const touchX = useRef<number | null>(null);
  const [note, setNote] = useState('');

  if (!f) {
    return (
      <>
        <div className="backbar"><a href="#/findings">Findings</a></div>
        <h1>Not found</h1>
        <p className="sub">This finding is not in the current demo dataset.</p>
      </>
    );
  }

  const tabIndex = TABS.indexOf(tab);
  const onTouchStart = (e: React.TouchEvent) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 48) {
      const next = dx < 0 ? Math.min(tabIndex + 1, 2) : Math.max(tabIndex - 1, 0);
      setTab(TABS[next]);
    }
    touchX.current = null;
  };

  const now = () => new Date().toISOString();
  const canPropose = f.status === 'open' || f.status === 'still_exposed' || f.status === 'reopened';
  const canSubmit = f.status === 'fix_proposed';
  const canRetest = f.status === 'awaiting_retest';

  return (
    <>
      <div className="backbar"><a href="#/findings">Findings</a></div>
      <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <SeverityChip s={f.severity} />
        <ConfidenceChip c={f.confidence} />
        <StatusChip status={f.status} />
      </div>
      <h1 style={{ marginTop: 10 }}>{f.title}</h1>
      <p className="sub">
        {f.asset.kind}:{f.asset.value} · reported by {f.sources.join(' + ')} · first seen {f.firstSeenScanId}
      </p>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="tabpane" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {tab === 'Evidence' && (
          <div>
            {f.evidence.map((e, i) => (
              <div className="evidence" key={i}>
                <strong>{e.type}</strong> — {e.summary}
                {e.detail && <div style={{ marginTop: 6 }}>{e.detail}</div>}
                {e.reproduction && <pre className="patch">{e.reproduction}</pre>}
                <div className="meta">captured {e.capturedAt} · redaction applied</div>
              </div>
            ))}
            {f.confidence === 'unverified' && (
              <p className="sub">This is a tool claim without supporting proof. It cannot affect the grade until verified.</p>
            )}
          </div>
        )}

        {tab === 'Fix' && (
          <div>
            {f.fix ? (
              <>
                <p>{f.fix.summary}</p>
                {f.fix.patch && <pre className="patch">{f.fix.patch}</pre>}
                <p className="sub">proposed by {f.fix.proposedBy} at {f.fix.proposedAt}</p>
              </>
            ) : (
              <p className="sub">No fix proposal yet. A proposal is a minimal patch plus an explanation - never auto-applied.</p>
            )}
            <div className="btn-row">
              <button
                className="btn"
                disabled={!canPropose}
                onClick={() => {
                  state.svc.proposeFix(demoActorAdmin, f.fingerprint, {
                    summary: `Remediate: ${f.title}`,
                    patch: `# Minimal change proposal (demo)\n# 1. Apply the corrective configuration for: ${f.title}\n# 2. Deploy to staging\n# 3. Submit for retest - fix is not verified until retest passes`,
                    proposedBy: 'sts-agent (demo)',
                    proposedAt: now(),
                  });
                  refresh();
                }}
              >
                Propose fix (demo)
              </button>
              <button
                className="btn ghost"
                disabled={!canSubmit}
                onClick={() => {
                  state.svc.submitForRetest(demoActorAdmin, f.fingerprint, now());
                  refresh();
                }}
              >
                Submit for retest
              </button>
            </div>
          </div>
        )}

        {tab === 'Retest' && (
          <div>
            <p className="sub">
              Only a retest moves a finding to verified-fixed. The reviewer role records the outcome; the AI never marks its own homework passed.
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Retest note (what was re-run, what was observed)"
              style={{
                width: '100%', padding: 11, borderRadius: 'var(--radius)',
                border: '1px solid var(--line)', background: 'var(--bg-raise)',
                color: 'var(--ink)', font: 'inherit', marginBottom: 4,
              }}
            />
            <div className="btn-row">
              <button
                className="btn"
                disabled={!canRetest}
                onClick={() => {
                  state.svc.recordRetest(demoActorReviewer, f.fingerprint, true, now(), note || undefined);
                  refresh();
                }}
              >
                Retest passed
              </button>
              <button
                className="btn subtle"
                disabled={!canRetest}
                onClick={() => {
                  state.svc.recordRetest(demoActorReviewer, f.fingerprint, false, now(), note || undefined);
                  refresh();
                }}
              >
                Still exposed
              </button>
            </div>
            {!canRetest && <p className="sub" style={{ marginTop: 10 }}>Current status '{f.status.replace(/_/g, ' ')}' is not awaiting a retest.</p>}
          </div>
        )}
      </div>
    </>
  );
}
