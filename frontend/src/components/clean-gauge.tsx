'use client';

import React from 'react';

interface CleanGaugeProps {
  score?: number; // e.g. 832 out of 1000
  errorRate?: number;
}

export function CleanGauge({ score = 832 }: CleanGaugeProps) {
  // Score clamped between 0 and 1000
  const clampedScore = Math.max(300, Math.min(1000, score));
  // Normalize ratio: 300 -> 0, 1000 -> 1 (or 0 to 1000)
  const ratio = (clampedScore - 300) / 700; // ~0.76 for 832

  const cx = 70;
  const cy = 68;
  const r = 50;

  // Rotation: 0° is at 9 o'clock (left), 90° is at 12 o'clock (top), 180° is at 3 o'clock (right)
  const rotationDeg = Math.round(ratio * 180);

  return (
    <div className="relative w-[140px] h-[75px] select-none">
      <svg viewBox="0 0 140 75" className="w-full h-full overflow-visible">
        {/* Gray Semicircle Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#D4D4D8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Warning Tick (~65%) */}
        <line
          x1={cx + r * Math.cos((-55 * Math.PI) / 180)}
          y1={cy + r * Math.sin((-55 * Math.PI) / 180)}
          x2={cx + (r - 7) * Math.cos((-55 * Math.PI) / 180)}
          y2={cy + (r - 7) * Math.sin((-55 * Math.PI) / 180)}
          stroke="#F59E0B"
          strokeWidth="1.5"
        />

        {/* Critical Tick (~85%) */}
        <line
          x1={cx + r * Math.cos((-25 * Math.PI) / 180)}
          y1={cy + r * Math.sin((-25 * Math.PI) / 180)}
          x2={cx + (r - 7) * Math.cos((-25 * Math.PI) / 180)}
          y2={cy + (r - 7) * Math.sin((-25 * Math.PI) / 180)}
          stroke="#EF4444"
          strokeWidth="1.5"
        />

        {/* Needle: Rotates clockwise from 9 o'clock towards 3 o'clock */}
        <line
          x1={cx}
          y1={cy}
          x2={cx - r + 8}
          y2={cy}
          stroke="#18181B"
          strokeWidth="1.75"
          strokeLinecap="round"
          transform={`rotate(${rotationDeg}, ${cx}, ${cy})`}
          className="transition-transform duration-700 ease-out"
        />

        {/* Pivot Center Point */}
        <circle cx={cx} cy={cy} r="3" fill="#18181B" />
      </svg>
    </div>
  );
}
