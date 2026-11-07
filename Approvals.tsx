import React, { useContext } from 'react';
import { Ctx } from '../App';
import { FindingCard } from '../components/FindingCard';

export function Approvals() {
  const { state, navigate } = useContext(Ctx);
  const pending = state.svc.pendingApprovals();
  return (
    <>
      <div className="backbar"><a href="#/">Home</a></div>
      <h1>Approvals</h1>
      <p className="sub">Human gates: fix proposals awaiting submission and retests awaiting a reviewer verdict.</p>
      <div className="grid">
        {pending.map((f) => (
          <FindingCard key={f.fingerprint} f={f} onOpen={(fp) => navigate(`/finding/${fp}`)} />
        ))}
        {pending.length === 0 && <p className="sub">Nothing waiting. Queue is clear.</p>}
      </div>
    </>
  );
}
