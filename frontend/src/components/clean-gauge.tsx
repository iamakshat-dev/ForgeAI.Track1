'use client';

import React from 'react';

interface CleanGaugeProps {
  errorRate: number; // e.g. 0.0035 = 0.35%
  maxScale?: number; // e.g. 0.05 = 5.0%
}

export function CleanGauge({ errorRate, maxScale = 0.05 }: CleanGaugeProps) {
  // Clamped ratio between 0 and 1
  const ratio = Math.min(Math.max(errorRate / maxScale, 0), 1);
  // Angle: -180 deg (left) to 0 deg (right)
  const angle = 180 + ratio * 180;

  const cx = 85;
  const cy = 75;
  const r = 58;

  const rad = (angle * Math.PI) / 180;
  const needleX = cx + (r - 10) * Math.cos(rad);
  const needleY = cy + (r - 10) * Math.sin(rad);

  const isCritical = errorRate > 0.03;
  const isWarning = errorRate > 0.015;

  return (
    <div className="relative flex flex-col items-center justify-center w-36 h-24">
      <svg viewBox="0 0 170 100" className="w-full h-full overflow-visible">
        {/* Background Track Arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#E5E5E5"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Dynamic Active Arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#171717'}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${ratio * (Math.PI * r)} 400`}
          className="transition-all duration-700 ease-out"
        />

        {/* 2σ Tick Mark */}
        <line
          x1={cx + r * Math.cos((240 * Math.PI) / 180)}
          y1={cy + r * Math.sin((240 * Math.PI) / 180)}
          x2={cx + (r - 6) * Math.cos((240 * Math.PI) / 180)}
          y2={cy + (r - 6) * Math.sin((240 * Math.PI) / 180)}
          stroke="#A3A3A3"
          strokeWidth="1.5"
        />

        {/* 3σ Tick Mark */}
        <line
          x1={cx + r * Math.cos((300 * Math.PI) / 180)}
          y1={cy + r * Math.sin((300 * Math.PI) / 180)}
          x2={cx + (r - 6) * Math.cos((300 * Math.PI) / 180)}
          y2={cy + (r - 6) * Math.sin((300 * Math.PI) / 180)}
          stroke="#EF4444"
          strokeWidth="1.5"
        />

        {/* Minimal Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#171717"
          strokeWidth="2"
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Center Pivot Point */}
        <circle cx={cx} cy={cy} r="3" fill="#171717" />
      </svg>
    </div>
  );
}
