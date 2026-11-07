import React, { useContext } from 'react';
import { Ctx } from '../App';
import { THEMES } from '../state/store';

export function Settings() {
  const { state, setTheme, setReducedMotion } = useContext(Ctx);
  return (
    <>
      <div className="backbar"><a href="#/">Home</a></div>
      <h1>Design & motion</h1>
      <p className="sub">Three switchable design languages over the same working foundation and data. Pick one to preview.</p>
      <div className="theme-switch">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className="theme-option"
            aria-pressed={state.theme === t.id}
            onClick={() => setTheme(t.id)}
          >
            <div className="name">{t.name}</div>
            <div className="blurb">{t.blurb}</div>
          </button>
        ))}
      </div>
      <div className="panel" style={{ marginTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="checkbox"
            checked={state.reducedMotion}
            onChange={(e) => setReducedMotion(e.target.checked)}
          />
          Reduced motion (also follows the OS preference automatically)
        </label>
      </div>
    </>
  );
}
