/**
 * Orbital asset map. Every rendered element is bound to live store data:
 * nodes are targets, satellites are findings (colour = severity, ring =
 * confidence), motion only reflects an active scan replay or settles still.
 * Honours reduced motion: renders one static frame.
 */
import React, { useEffect, useRef } from 'react';
import type { Finding } from '../state/store';
import type { Target } from '../../../core/authorization';

const SEV_COLOUR: Record<Finding['severity'], string> = {
  critical: '#ff4d5e',
  high: '#ff8a4d',
  medium: '#ffc24d',
  low: '#6db3ff',
  info: '#8b93a7',
};

interface Props {
  targets: Target[];
  findings: Finding[];
  scanning: boolean;
  reducedMotion: boolean;
  accent: string;
  onSelectTarget?: (targetId: string) => void;
}

export function OrbitalMap({ targets, findings, scanning, reducedMotion, accent, onSelectTarget }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<Array<{ x: number; y: number; r: number; id: string }>>([]);
  const stateRef = useRef({ targets, findings, scanning });
  stateRef.current = { targets, findings, scanning };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    let angle = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { targets, findings, scanning } = stateRef.current;
      const cx = w / 2;
      const cy = h / 2;
      const dt = (now - last) / 1000;
      last = now;
      if (scanning && !reducedMotion) angle += dt * 0.35;

      // core
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      ctx.font = '600 10px system-ui';
      ctx.fillStyle = 'rgba(140,150,190,0.9)';
      ctx.textAlign = 'center';
      ctx.fillText('STS', cx, cy + 22);

      hitRef.current = [];
      const n = targets.length;
      targets.forEach((t, i) => {
        const orbit = 62 + i * 34;
        const a = angle + (i * Math.PI * 2) / n;
        const x = cx + Math.cos(a) * orbit;
        const y = cy + Math.sin(a) * orbit * 0.62;

        // orbit path
        ctx.beginPath();
        ctx.ellipse(cx, cy, orbit, orbit * 0.62, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(139,124,255,0.12)';
        ctx.stroke();

        // target node
        const verified = t.verification.status === 'verified';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = verified ? accent : '#8b93a7';
        if (!verified) ctx.setLineDash([2, 2]);
        ctx.fill();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(150,160,205,0.95)';
        ctx.textAlign = x < 90 ? 'left' : x > w - 90 ? 'right' : 'center';
        ctx.fillText(t.value, x < 90 ? 8 : x > w - 90 ? w - 8 : x, y + 18);
        ctx.textAlign = 'center';
        hitRef.current.push({ x, y, r: 14, id: t.id });

        // findings as satellites
        const related = findings.filter((f) =>
          f.asset.value.replace(/^https?:\/\//, '').replace(/\/+$/, '') === t.value,
        );
        related.forEach((f, j) => {
          const fa = a + 0.55 + j * 0.4;
          const fx = x + Math.cos(fa) * 16;
          const fy = y + Math.sin(fa) * 12;
          ctx.beginPath();
          ctx.arc(fx, fy, f.confidence === 'unverified' ? 2.5 : 4, 0, Math.PI * 2);
          ctx.fillStyle = SEV_COLOUR[f.severity];
          ctx.globalAlpha = f.confidence === 'unverified' ? 0.55 : 1;
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      });

      if (!reducedMotion) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, accent]);

  return (
    <div className="orbital-wrap">
      <canvas
        ref={canvasRef}
        onClick={(e) => {
          if (!onSelectTarget) return;
          const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const hit = hitRef.current.find((h) => Math.hypot(h.x - x, h.y - y) <= h.r);
          if (hit) onSelectTarget(hit.id);
        }}
      />
      <div className="orbital-legend">
        <span><i style={{ background: accent }} /> verified target</span>
        <span><i style={{ background: '#8b93a7' }} /> unverified</span>
        <span><i style={{ background: '#ff4d5e' }} /> finding (size = confidence)</span>
      </div>
    </div>
  );
}
