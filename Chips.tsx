import React from 'react';
import type { Finding } from '../state/store';

export function SeverityChip({ s }: { s: Finding['severity'] }) {
  return <span className={`chip sev-${s}`}>{s}</span>;
}
export function ConfidenceChip({ c }: { c: Finding['confidence'] }) {
  return <span className={`chip conf-${c}`}>{c}</span>;
}
export function StatusChip({ status }: { status: Finding['status'] }) {
  const label = status.replace(/_/g, ' ');
  return <span className={`chip status ${status}`}>{label}</span>;
}
