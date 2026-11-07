import React from 'react';
import type { Finding } from '../state/store';
import { SeverityChip, ConfidenceChip, StatusChip } from './Chips';

export function FindingCard({ f, onOpen }: { f: Finding; onOpen: (fp: string) => void }) {
  return (
    <button className="finding-card" onClick={() => onOpen(f.fingerprint)}>
      <div className="row">
        <SeverityChip s={f.severity} />
        <ConfidenceChip c={f.confidence} />
        <StatusChip status={f.status} />
      </div>
      <h3>{f.title}</h3>
      <div className="asset">{f.asset.kind}:{f.asset.value.replace(/^https?:\/\//, '')}</div>
      <div className="row" style={{ marginTop: 6, color: 'var(--ink-dim)', fontSize: 12 }}>
        <span>{f.sources.join(' + ')}</span>
        <span>·</span>
        <span>{f.evidence.length} evidence</span>
      </div>
    </button>
  );
}
