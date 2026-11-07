import React, { useEffect, useMemo, useState } from 'react';
import {
  buildSeededService,
  buildSecondScanService,
  THEMES,
  DEMO_LABEL,
  type ThemeId,
} from './state/store';
import type { AssuranceService } from '../../core/service';
import { Home } from './pages/Home';
import { FindingsPage } from './pages/Findings';
import { FindingDetail } from './pages/FindingDetail';
import { ScanRun } from './pages/ScanRun';
import { Approvals } from './pages/Approvals';
import { Assets } from './pages/Assets';
import { Settings } from './pages/Settings';

export interface AppState {
  svc: AssuranceService;
  theme: ThemeId;
  reducedMotion: boolean;
  scanning: boolean;
  version: number; // bump to re-render after service mutations
}

function useHashRoute(): [string, (to: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const on = () => setHash(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return [hash, (to: string) => (window.location.hash = to)];
}

function safeGet(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { window.localStorage.setItem(key, value); } catch { /* storage unavailable */ }
}

export const Ctx = React.createContext<{
  state: AppState;
  setTheme: (t: ThemeId) => void;
  setReducedMotion: (b: boolean) => void;
  setScanning: (b: boolean) => void;
  refresh: () => void;
  runSecondScan: () => void;
  navigate: (to: string) => void;
}>(null as never);

export function App() {
  const [route, navigate] = useHashRoute();
  const [svc] = useState(() => buildSeededService());
  const [theme, setTheme] = useState<ThemeId>(
    () => (safeGet('sts-theme') as ThemeId) || 'orbital',
  );
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      safeGet('sts-motion') === 'reduced' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [scanning, setScanning] = useState(false);
  const [version, setVersion] = useState(0);
  const [secondScanDone, setSecondScanDone] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    safeSet('sts-theme', theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full';
    safeSet('sts-motion', reducedMotion ? 'reduced' : 'full');
  }, [reducedMotion]);

  const state: AppState = useMemo(
    () => ({ svc, theme, reducedMotion, scanning, version }),
    [svc, theme, reducedMotion, scanning, version],
  );

  const approvals = svc.pendingApprovals().length;

  const ctx = {
    state,
    setTheme,
    setReducedMotion,
    setScanning,
    refresh: () => setVersion((v) => v + 1),
    runSecondScan: () => {
      if (secondScanDone) return;
      buildSecondScanService(svc);
      setSecondScanDone(true);
      setVersion((v) => v + 1);
    },
    navigate,
  };

  let page: React.ReactNode;
  if (route === '/') page = <Home />;
  else if (route === '/findings') page = <FindingsPage />;
  else if (route.startsWith('/finding/')) page = <FindingDetail fingerprint={route.slice('/finding/'.length)} />;
  else if (route === '/scan') page = <ScanRun />;
  else if (route === '/approvals') page = <Approvals />;
  else if (route === '/assets') page = <Assets />;
  else if (route === '/settings') page = <Settings />;
  else page = <Home />;

  return (
    <Ctx.Provider value={ctx}>
      <div className="demo-banner">{DEMO_LABEL} · prototype build 0.1.0</div>
      <header className="topbar">
        <a className="brand" href="#/">
          <span className="dot" />
          <span>STS Next</span>
        </a>
        <a className="approvals-pill" data-hot={approvals > 0} href="#/approvals">
          {approvals} approval{approvals === 1 ? '' : 's'} needed
        </a>
        <nav>
          <a href="#/findings" className={route.startsWith('/finding') ? 'active' : ''}>Findings</a>
          <a href="#/scan" className={route === '/scan' ? 'active' : ''}>Scan</a>
          <a href="#/assets" className={route === '/assets' ? 'active' : ''}>Assets</a>
          <a href="#/settings" className={route === '/settings' ? 'active' : ''}>Design</a>
        </nav>
      </header>
      <main className="page">{page}</main>
      <footer className="foot">
        SecureTotalScan Next · isolated expansion prototype · themes: {THEMES.map((t) => t.name).join(' / ')} · not a production release
      </footer>
    </Ctx.Provider>
  );
}
