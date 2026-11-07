import React, { useContext } from 'react';
import { Ctx } from '../App';
import { Pipeline } from '../components/Pipeline';

export function ScanRun() {
  const { state, setScanning, runSecondScan, refresh } = useContext(Ctx);
  return (
    <>
      <div className="backbar"><a href="#/">Home</a></div>
      <h1>Demo scan replay</h1>
      <p className="sub">
        Deterministic replay of a synthetic six-agent run. Timings and notes come from the recorded demo event stream - nothing is being scanned.
      </p>
      <Pipeline
        running={state.scanning}
        reducedMotion={state.reducedMotion}
        onDone={() => setScanning(false)}
      />
      <div className="btn-row">
        <button className="btn" disabled={state.scanning} onClick={() => setScanning(true)}>
          {state.scanning ? 'Replaying…' : 'Replay run'}
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            runSecondScan();
            refresh();
          }}
        >
          Ingest second demo scan (diff + regression)
        </button>
      </div>
      <p className="sub" style={{ marginTop: 12, fontSize: 12.5 }}>
        The second scan demonstrates the monitoring engine: fixed findings stay verified, a regression reopens, and new findings join the queue.
      </p>
    </>
  );
}
