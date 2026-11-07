import React, { useContext } from 'react';
import { Ctx } from '../App';
import { authoriseScan } from '../../../core/authorization';

export function Assets() {
  const { state } = useContext(Ctx);
  const targets = ['t-shop', 't-api', 't-repo', 't-landing']
    .map((id) => state.svc.getTarget(id)!)
    .filter(Boolean);
  return (
    <>
      <div className="backbar"><a href="#/">Home</a></div>
      <h1>Assets & authorisation</h1>
      <p className="sub">
        Every target carries a verification state and an agreed testing scope. The gate is fail-closed: unverified or out-of-scope work is refused with named reasons.
      </p>
      <div className="grid">
        {targets.map((t) => {
          const passive = authoriseScan(t, ['passive_headers']);
          const active = authoriseScan(t, ['dast_baseline']);
          return (
            <div className="panel" key={t.id}>
              <div className="row" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{t.value}</strong>
                <span className={`chip ${t.verification.status === 'verified' ? 'conf-confirmed' : 'conf-unverified'}`}>
                  {t.verification.status}
                </span>
                <span className="chip status">{t.scope.environment}</span>
              </div>
              <p className="sub" style={{ margin: '8px 0 0', fontSize: 13 }}>
                scope: {t.scope.techniques.join(', ')} · {t.scope.rateLimitPerMinute} req/min · active {t.scope.allowActive ? 'allowed' : 'off'}
              </p>
              <p className="sub" style={{ margin: '6px 0 0', fontSize: 13 }}>
                passive scan: {passive.allowed ? '✓ permitted' : `✗ refused - ${passive.refused[0]}`}
                <br />
                active test: {active.allowed ? '✓ permitted' : `✗ refused - ${active.refused[0] ?? 'not in scope'}`}
              </p>
            </div>
          );
        })}
      </div>
    </>
  );
}
