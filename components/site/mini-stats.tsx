"use client";

import { useEffect, useRef, useState } from "react";
import { ScoreNumber } from "@/components/design-system/score-number";

// Fila de mini-stats tipo scoreboard, debajo del hero. Count-up al entrar en
// viewport (IntersectionObserver, sin librerías). Respeta prefers-reduced-motion:
// si está activo, muestra el valor final de una y no anima.

const STATS = [
  { target: 8, label: "Equipos" },
  { target: 2026, label: "Temporada" },
  { target: 1, label: "Pasión" },
];

const DURACION = 1100;

function Stat({ target, label, run, reduce }: { target: number; label: string; run: boolean; reduce: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!run) return;
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min((ts - start) / DURACION, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, reduce, target]);

  return <ScoreNumber value={value} label={label} size="lg" accent="gold" />;
}

export function MiniStats() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRun(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="border-t border-white/10 bg-bg-elevated/40">
      <div className="lbsc-container grid grid-cols-3 gap-4 py-8 sm:py-10">
        {STATS.map((s) => (
          <Stat key={s.label} target={s.target} label={s.label} run={run} reduce={reduce} />
        ))}
      </div>
    </div>
  );
}
