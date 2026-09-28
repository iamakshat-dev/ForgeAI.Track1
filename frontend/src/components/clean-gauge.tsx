'use client';

import React from 'react';

interface CleanGaugeProps {
  errorRate: number; // e.g. 0.0035 = 0.35%
  maxScale?: number; // e.g. 0.05 = 5.0%
}

export function CleanGauge({ errorRate, maxScale = 0.05 }: CleanGaugeProps) {
  // Clamped ratio between 0 and 1
  const ratio = Math.min(Math.max(errorRate / maxScale, 0), 1);
  // Angle: -180° (left) to 0° (right)
  const angleDeg = -180 + ratio * 180;
  const angleRad = (angleDeg * Math.PI) / 180;

  const cx = 70;
  const cy = 68;
  const r = 52;

  // Needle tip
  const needleLength = 46;
  const needleX = cx + needleLength * Math.cos(angleRad);
  const needleY = cy + needleLength * Math.sin(angleRad);

  return (
    <div className="relative w-[140px] h-[75px] select-none">
      <svg viewBox="0 0 140 75" className="w-full h-full overflow-visible">
        {/* Gray Track Semicircle */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#D4D4D8"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 2-Sigma Warning Tick */}
        <line
          x1={cx + r * Math.cos((-60 * Math.PI) / 180)}
          y1={cy + r * Math.sin((-60 * Math.PI) / 180)}
          x2={cx + (r - 7) * Math.cos((-60 * Math.PI) / 180)}
          y2={cy + (r - 7) * Math.sin((-60 * Math.PI) / 180)}
          stroke="#F59E0B"
          strokeWidth="1.5"
        />

        {/* 3-Sigma Critical Tick */}
        <line
          x1={cx + r * Math.cos((-30 * Math.PI) / 180)}
          y1={cy + r * Math.sin((-30 * Math.PI) / 180)}
          x2={cx + (r - 7) * Math.cos((-30 * Math.PI) / 180)}
          y2={cy + (r - 7) * Math.sin((-30 * Math.PI) / 180)}
          stroke="#EF4444"
          strokeWidth="1.5"
        />

        {/* Fine Minimalist Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#18181B"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Center Pivot */}
        <circle cx={cx} cy={cy} r="3" fill="#18181B" />
      </svg>
    </div>
  );
}
