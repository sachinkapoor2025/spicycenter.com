"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

const COLORS = ["#e11d48", "#c4a35a", "#4876e8", "#183a68", "#fbbf24", "#34d399", "#f472b6", "#ffffff"];

type Particle = {
  id: number;
  left: string;
  delay: string;
  duration: string;
  color: string;
  size: number;
  dx: string;
  rot: string;
};

/** Lightweight cracker / confetti burst — no external dependency. */
export function ConfettiBurst({ active, burstKey = 0 }: { active: boolean; burstKey?: number }) {
  const particles = useMemo(() => {
    if (!active) return [] as Particle[];
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: `${8 + Math.random() * 84}%`,
      delay: `${Math.random() * 0.15}s`,
      duration: `${1.1 + Math.random() * 0.9}s`,
      color: COLORS[i % COLORS.length]!,
      size: 5 + Math.floor(Math.random() * 7),
      dx: `${(Math.random() - 0.5) * 140}px`,
      rot: `${(Math.random() - 0.5) * 720}deg`,
    }));
  }, [active, burstKey]);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 2200);
    return () => window.clearTimeout(t);
  }, [active, burstKey]);

  if (!visible || particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden" aria-hidden>
      <style>{`
        @keyframes daily-deal-confetti {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--dx), 110vh) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <span
          key={`${burstKey}-${p.id}`}
          className="absolute top-[28%] rounded-[1px]"
          style={
            {
              left: p.left,
              width: p.size,
              height: p.size * (0.6 + (p.id % 3) * 0.4),
              background: p.color,
              animation: `daily-deal-confetti ${p.duration} ${p.delay} ease-in forwards`,
              "--dx": p.dx,
              "--rot": p.rot,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
