import React, { useContext, useState } from 'react';
import { Ctx } from '../App';
import { FindingCard } from '../components/FindingCard';
import { compareFindings, type Finding } from '../../../core/findings';

type Filter = 'all' | Finding['severity'] | 'needs-action';

export function FindingsPage() {
  const { state, navigate } = useContext(Ctx);
  const [filter, setFilter] = useState<Filter>('all');
  let findings = state.svc.listFindings().sort(compareFindings);
  if (filter === 'needs-action') {
    findings = findings.filter((f) => ['open', 'fix_proposed', 'awaiting_retest', 'reopened', 'still_exposed'].includes(f.status));
  } else if (filter !== 'all') {
    findings = findings.filter((f) => f.severity === filter);
  }

  return (
    <>
      <h1>Findings queue</h1>
      <p className="sub">Deduplicated across tools. Confidence and status are explicit on every row.</p>
      <div className="btn-row" style={{ marginTop: 0, marginBottom: 14 }}>
        {(['all', 'needs-action', 'critical', 'high', 'medium', 'low'] as Filter[]).map((f) => (
          <button key={f} className={`btn subtle`} aria-pressed={filter === f} style={filter === f ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>
      <div className="grid">
        {findings.map((f) => (
          <FindingCard key={f.fingerprint} f={f} onOpen={(fp) => navigate(`/finding/${fp}`)} />
        ))}
        {findings.length === 0 && <p className="sub">No findings match this filter.</p>}
      </div>
    </>
  );
}
