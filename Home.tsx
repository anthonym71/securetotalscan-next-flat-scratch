import React, { useContext } from 'react';
import { Ctx } from '../App';
import { OrbitalMap } from '../components/OrbitalMap';
import { Pipeline } from '../components/Pipeline';
import { SeverityChip } from '../components/Chips';
import { gradeFindings } from '../../../core/findings';

export function Home() {
  const { state, navigate } = useContext(Ctx);
  const { svc, theme, reducedMotion, scanning } = state;
  const findings = svc.listFindings();
  const targets = ['t-shop', 't-api', 't-repo', 't-landing']
    .map((id) => svc.getTarget(id)!)
    .filter(Boolean);
  const grade = gradeFindings(findings, false); // coverage incomplete by design tonight
  const bySev = findings.reduce<Record<string, number>>((m, f) => {
    m[f.severity] = (m[f.severity] ?? 0) + 1;
    return m;
  }, {});

  return (
    <>
      <div className="backbar" style={{ visibility: 'hidden' }}><a>.</a></div>
      <h1>Assurance, not alarms.</h1>
      <p className="sub">
        Find with evidence · fix · verify by retest · keep watching. Synthetic demo data throughout.
      </p>

      {theme === 'orbital' && (
        <OrbitalMap
          targets={targets}
          findings={findings}
          scanning={scanning}
          reducedMotion={reducedMotion}
          accent="#8b7cff"
          onSelectTarget={() => navigate('/assets')}
        />
      )}

      {theme === 'mission' && (
        <div className="panel">
          <Pipeline running={scanning} reducedMotion={reducedMotion} />
        </div>
      )}

      {theme === 'precision' && (
        <div className="panel">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-dim)' }}>
                <th style={{ padding: '6px 4px' }}>Severity</th>
                <th style={{ padding: '6px 4px' }}>Findings</th>
              </tr>
            </thead>
            <tbody>
              {(['critical', 'high', 'medium', 'low', 'info'] as const).map((s) => (
                <tr key={s} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 4px' }}><SeverityChip s={s} /></td>
                  <td style={{ padding: '8px 4px', fontFamily: 'var(--font-display)', fontSize: 18 }}>{bySev[s] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid cols-3" style={{ marginTop: 14 }}>
        <div className="panel kpi">
          <div className="num">{findings.length}</div>
          <div className="lbl">deduped findings</div>
        </div>
        <div className="panel kpi">
          <div className="num">{targets.filter((t) => t.verification.status === 'verified').length}/{targets.length}</div>
          <div className="lbl">targets verified</div>
        </div>
        <div className="panel kpi">
          <div className="num" title={grade.rationale}>{grade.grade}</div>
          <div className="lbl">grade (coverage incomplete)</div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn" onClick={() => navigate('/scan')}>Replay demo scan</button>
        <button className="btn ghost" onClick={() => navigate('/findings')}>Open findings queue</button>
      </div>
      <p className="sub" style={{ marginTop: 14, fontSize: 12.5 }}>
        {grade.rationale}
      </p>
    </>
  );
}
