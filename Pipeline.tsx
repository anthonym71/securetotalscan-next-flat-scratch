/**
 * Agent pipeline board. Replays the deterministic SYNTHETIC demo run event
 * stream in real time; lamp states come from the stream, not timers alone.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { demoRunEvents } from '../state/store';

interface NodeState {
  agent: string;
  state: 'pending' | 'running' | 'done' | 'skipped';
  note?: string;
}

export function Pipeline({ running, onDone, reducedMotion }: { running: boolean; onDone?: () => void; reducedMotion: boolean }) {
  const agents = useMemo(() => Array.from(new Set(demoRunEvents.map((e) => e.agent))), []);
  const [nodes, setNodes] = useState<NodeState[]>(agents.map((agent) => ({ agent, state: 'pending' })));

  useEffect(() => {
    if (!running) {
      setNodes(agents.map((agent) => ({ agent, state: 'pending' })));
      return;
    }
    setNodes(agents.map((agent) => ({ agent, state: 'pending' })));
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const ev of demoRunEvents) {
      timers.push(
        setTimeout(
          () => {
            setNodes((prev) =>
              prev.map((n) => (n.agent === ev.agent ? { agent: n.agent, state: ev.state, note: ev.note } : n)),
            );
          },
          reducedMotion ? Math.min(ev.at, 400) : ev.at,
        ),
      );
    }
    const lastAt = Math.max(...demoRunEvents.map((e) => e.at));
    timers.push(
      setTimeout(() => onDone?.(), reducedMotion ? 500 : lastAt + 250),
    );
    return () => timers.forEach(clearTimeout);
  }, [running, agents, onDone, reducedMotion]);

  return (
    <div className="pipe">
      {nodes.map((n) => (
        <div className="pipe-node" data-state={n.state} key={n.agent}>
          <span className="lamp" />
          <span>{n.agent}</span>
          <span className="note">{n.state === 'pending' ? 'queued' : n.note ?? n.state}</span>
        </div>
      ))}
    </div>
  );
}
