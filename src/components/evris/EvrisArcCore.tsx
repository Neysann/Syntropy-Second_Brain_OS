'use client';

import React, { useEffect, useRef } from 'react';

export type EvrisCoreState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'happy'
  | 'alert'
  | 'error'
  | 'sleep';

export interface EvrisCoreStateMeta {
  name: string;
  title: string;
  detail: string;
  icon: string;
  color: string;
}

export const EVRIS_CORE_STATES: Record<EvrisCoreState, EvrisCoreStateMeta> = {
  idle: {
    name: 'Au repos',
    title: 'Evris est disponible.',
    detail: 'Le noyau ARC attend votre prochaine interaction.',
    icon: '◌',
    color: '#22d7e8',
  },
  listening: {
    name: 'À l’écoute',
    title: 'Evris vous écoute.',
    detail: 'Un signal rejoint le noyau ARC.',
    icon: '◖',
    color: '#22d7e8',
  },
  thinking: {
    name: 'En réflexion',
    title: 'Evris cherche une réponse.',
    detail: 'Les points du noyau se synchronisent.',
    icon: '···',
    color: '#a89aff',
  },
  speaking: {
    name: 'En réponse',
    title: 'Evris vous répond.',
    detail: 'Une impulsion rayonne depuis le noyau.',
    icon: '≋',
    color: '#22d7e8',
  },
  happy: {
    name: 'Ravi',
    title: 'Action exécutée.',
    detail: 'Le noyau s’illumine avec une étincelle ambre.',
    icon: '✳',
    color: '#ffa337',
  },
  alert: {
    name: 'Attention',
    title: 'Validation requise.',
    detail: 'L’arc pulse en ambre en attente de votre accord.',
    icon: '!',
    color: '#ffa337',
  },
  error: {
    name: 'Incident',
    title: 'Signal de diagnostic.',
    detail: 'Quelque chose a interrompu E.V.R.I.S.',
    icon: '×',
    color: '#ffa337',
  },
  sleep: {
    name: 'En veille',
    title: 'Evris est en veille.',
    detail: 'Le noyau ralentit et baisse sa lumière.',
    icon: '☾',
    color: '#6f91a3',
  },
};

const MATRIX_SIZE = 25;

const PALETTE: Record<string, string> = {
  N: '#061522',
  D: '#16485b',
  C: '#22d7e8',
  W: '#dff6f8',
  O: '#ffa337',
  V: '#a89aff',
  S: '#83a8b8',
};

const GLYPHS: Record<string, string[]> = {
  '-': ['00000', '00000', '11111', '00000', '00000'],
  '?': ['01110', '10001', '00010', '00100', '00100'],
  '...': ['00000', '00000', '10101', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00000', '00100'],
  '*': ['00100', '10101', '01110', '10101', '00100'],
  x: ['10001', '01010', '00100', '01010', '10001'],
  _: ['00000', '00000', '00000', '00000', '11111'],
};

const SYMBOL_BY_STATE: Record<EvrisCoreState, string> = {
  idle: '-',
  listening: '?',
  thinking: '...',
  speaking: '!',
  happy: '*',
  alert: '!',
  error: 'x',
  sleep: '_',
};

const COLOR_BY_STATE: Record<EvrisCoreState, string> = {
  idle: 'C',
  listening: 'O',
  thinking: 'V',
  speaking: 'W',
  happy: 'O',
  alert: 'O',
  error: 'O',
  sleep: 'S',
};

function createGrid(): string[][] {
  return Array.from({ length: MATRIX_SIZE }, () => Array<string>(MATRIX_SIZE).fill(''));
}

function put(grid: string[][], x: number, y: number, color: string) {
  const rx = Math.round(x);
  const ry = Math.round(y);
  if (rx >= 0 && rx < MATRIX_SIZE && ry >= 0 && ry < MATRIX_SIZE) {
    grid[ry][rx] = color;
  }
}

function ring(
  grid: string[][],
  center: number,
  radius: number,
  color: string,
  thickness = 0.55,
  segments = 0,
  rotation = 0
) {
  for (let y = 0; y < MATRIX_SIZE; y += 1) {
    for (let x = 0; x < MATRIX_SIZE; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx) + rotation;
      const gap = segments > 0 && Math.abs(Math.sin((angle * segments) / 2)) < 0.14;
      if (Math.abs(distance - radius) <= thickness && !gap) {
        put(grid, x, y, color);
      }
    }
  }
}

function orbitPoint(center: number, radius: number, angle: number): [number, number] {
  return [center + Math.cos(angle) * radius, center + Math.sin(angle) * radius];
}

function clearGlyphZone(grid: string[][]) {
  for (let y = 10; y <= 14; y += 1) {
    for (let x = 10; x <= 14; x += 1) {
      grid[y][x] = '';
    }
  }
}

function drawGlyph(grid: string[][], symbol: string, color: string) {
  const rows = GLYPHS[symbol] || GLYPHS['...'];
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '1') put(grid, 10 + x, 10 + y, color);
    }
  }
}

function computeCoreGrid(elapsed: number, state: EvrisCoreState): string[][] {
  const grid = createGrid();
  const center = 12;
  const outer = 10.5;
  const middle = 7.5;
  const inner = 5.5;
  const rotation = state === 'thinking' || state === 'happy' ? elapsed * 0.00018 : 0;

  let outerColor = state === 'alert' || state === 'error' ? 'O' : state === 'sleep' ? 'D' : 'C';
  if (state === 'alert' && Math.floor(elapsed / 260) % 2) outerColor = 'D';
  if (state === 'error' && Math.floor(elapsed / 180) % 2) outerColor = 'O';

  ring(grid, center, outer, outerColor, 0.55, 4, rotation);
  ring(grid, center, middle, state === 'thinking' ? 'V' : 'D', 0.55, 0);
  ring(grid, center, inner, state === 'error' ? 'O' : state === 'sleep' ? 'S' : 'W', 0.55, 0);

  const orbit = 8.75;
  const orbitDot = (angle: number, color: string) => {
    const [x, y] = orbitPoint(center, orbit, angle);
    put(grid, x, y, color);
  };
  const cycle = (elapsed % 1800) / 1800;

  if (state === 'idle') {
    orbitDot(elapsed * 0.000075, 'O');
    ring(grid, center, inner + 0.25 + 0.25 * Math.sin(elapsed * 0.002), 'C', 0.55, 0);
  } else if (state === 'sleep') {
    orbitDot(-Math.PI / 2 + elapsed * 0.000025, 'D');
  } else if (state === 'listening') {
    const startAngle = -Math.PI * 0.72;
    for (let tail = 2; tail >= 0; tail -= 1) {
      const t = Math.max(0, cycle - tail * 0.06);
      const radius = outer - (outer - inner) * t;
      const [x, y] = orbitPoint(center, radius, startAngle + t * 0.24);
      put(grid, x, y, tail === 0 ? 'W' : 'O');
    }
    ring(grid, center, inner + 0.7 + 1.1 * (1 - cycle), 'C', 0.55, 0);
  } else if (state === 'thinking') {
    ring(grid, center, middle - 0.8, 'C', 0.55, 4, -elapsed * 0.0003);
    for (let i = 0; i < 4; i += 1) {
      orbitDot(
        elapsed * 0.00024 + (i * Math.PI) / 2,
        i === Math.floor(cycle * 4) ? 'W' : 'V'
      );
    }
  } else if (state === 'speaking') {
    const wave = inner + 0.8 + cycle * (outer - inner - 1.6);
    ring(grid, center, wave, 'C', 0.55, cycle > 0.45 ? 4 : 0, elapsed * 0.002);
    if (cycle > 0.3) ring(grid, center, wave - 1.6, 'D', 0.55, 4, -elapsed * 0.0015);
    for (let i = 0; i < 4; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 2;
      const [x, y] = orbitPoint(center, Math.max(inner + 0.8, wave - 1), angle);
      put(grid, x, y, i === 0 ? 'W' : 'O');
    }
  } else if (state === 'happy') {
    for (let i = 0; i < 4; i += 1) {
      orbitDot(elapsed * 0.00015 + (i * Math.PI) / 2, i % 2 ? 'C' : 'O');
    }
    ring(grid, center, middle, 'C', 0.55, 8, rotation);
  } else if (state === 'alert') {
    for (let i = 0; i < 4; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 2;
      const [x, y] = orbitPoint(center, outer - 1.3, a + cycle * 0.25);
      put(grid, x, y, 'O');
    }
    ring(grid, center, inner + 0.8 + cycle, 'O', 0.55, 4, rotation);
  } else if (state === 'error') {
    orbitDot(-Math.PI / 4, 'O');
    orbitDot(Math.PI * 0.75, 'O');
    ring(grid, center, middle - 1, 'O', 0.55, 4, rotation);
  }

  clearGlyphZone(grid);
  drawGlyph(grid, SYMBOL_BY_STATE[state], COLOR_BY_STATE[state]);
  return grid;
}

interface EvrisArcCoreProps {
  state: EvrisCoreState;
  size?: number;
  brightness?: number; // 20..100
  framed?: boolean;
  className?: string;
}

export const EvrisArcCore: React.FC<EvrisArcCoreProps> = ({
  state,
  size = 180,
  brightness = 88,
  framed = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EvrisCoreState>(state);
  const brightnessRef = useRef<number>(brightness);

  stateRef.current = state;
  brightnessRef.current = brightness;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const start = performance.now();
    let lastFrame = -1;
    let rafId = 0;

    const drawFrame = (elapsed: number) => {
      const grid = computeCoreGrid(elapsed, stateRef.current);
      const alpha = Math.max(0.2, Math.min(1, brightnessRef.current / 100));

      ctx.clearRect(0, 0, size, size);

      const gap = size >= 120 ? Math.max(1.5, size * 0.011) : Math.max(0.6, size * 0.012);
      const cell = (size - gap * (MATRIX_SIZE - 1)) / MATRIX_SIZE;
      const radius = Math.max(0.7, Math.min(2.2, cell * 0.32));

      for (let y = 0; y < MATRIX_SIZE; y += 1) {
        const py = y * (cell + gap);
        for (let x = 0; x < MATRIX_SIZE; x += 1) {
          const px = x * (cell + gap);
          const key = grid[y][x];

          if (!key) {
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 0.72;
            ctx.fillStyle = '#111d28';
          } else {
            const col = PALETTE[key] || '#22d7e8';
            ctx.globalAlpha = alpha;
            ctx.fillStyle = col;
            ctx.shadowColor = col;
            ctx.shadowBlur = size >= 100 ? Math.max(3, cell * 1.15) : Math.max(1.5, cell * 0.9);
          }

          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(px, py, cell, cell, radius);
          } else {
            ctx.rect(px, py, cell, cell);
          }
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      const frameIndex = Math.floor(now / 70);
      if (frameIndex !== lastFrame) {
        drawFrame(reduceMotion ? 0 : now - start);
        lastFrame = frameIndex;
      }
      if (!reduceMotion) {
        rafId = window.requestAnimationFrame(loop);
      }
    };

    drawFrame(0);
    if (!reduceMotion) {
      rafId = window.requestAnimationFrame(loop);
    }

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [size]);

  const meta = EVRIS_CORE_STATES[state];

  if (!framed) {
    return (
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`block select-none ${className}`}
        role="img"
        aria-label={`Noyau ARC E.V.R.I.S. — ${meta.name}`}
      />
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-2xl border border-[#243c4d] bg-[#07131e] select-none transition-shadow duration-500 ${className}`}
      style={{
        padding: size >= 120 ? 12 : 4,
        boxShadow: `0 0 0 1px rgba(34,215,232,0.08), 0 16px 40px rgba(0,0,0,0.42), 0 0 32px ${meta.color}18`,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block"
        role="img"
        aria-label={`Noyau ARC E.V.R.I.S. — ${meta.name}`}
      />
    </div>
  );
};
