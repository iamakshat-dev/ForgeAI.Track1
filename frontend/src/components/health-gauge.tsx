'use client';

import React from 'react';

interface HealthGaugeProps {
  errorRate: number; // e.g. 0.0035 = 0.35%
  maxScale?: number; // e.g. 0.05 = 5.0%
}

export function HealthGauge({ errorRate, maxScale = 0.05 }: HealthGaugeProps) {
  // Clamped ratio between 0 and 1
  const ratio = Math.min(Math.max(errorRate / maxScale, 0), 1);
  // Angle: -180 deg to 0 deg (or 180 deg sweep)
  const angle = 180 + ratio * 180;

  // Arc path constants
  const cx = 100;
  const cy = 90;
  const r = 70;

  // Calculate needle tip
  const rad = (angle * Math.PI) / 180;
  const needleX = cx + (r - 12) * Math.cos(rad);
  const needleY = cy + (r - 12) * Math.sin(rad);

  const getStatusColor = () => {
    if (errorRate > 0.03) return '#EF4444'; // Critical
    if (errorRate > 0.015) return '#F59E0B'; // Warning
    return '#10B981'; // Nominal
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[200px] h-[110px]">
      <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="needleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={getStatusColor()} floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Background track arc */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Colored gradient zone markers */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="2 6"
          opacity="0.6"
        />

        {/* Threshold Markers */}
        {/* Baseline (0.35%) tick mark at ~15% */}
        <line
          x1="45"
          y1="56"
          x2="52"
          y2="63"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.5"
        />
        {/* 2-sigma Warning tick mark at ~40% */}
        <line
          x1="82"
          y1="23"
          x2="85"
          y2="31"
          stroke="#F59E0B"
          strokeWidth="1.5"
          opacity="0.8"
        />
        {/* 3-sigma Critical tick mark at ~70% */}
        <line
          x1="135"
          y1="34"
          x2="130"
          y2="41"
          stroke="#EF4444"
          strokeWidth="1.5"
          opacity="0.8"
        />

        {/* Needle Line */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={getStatusColor()}
          strokeWidth="2"
          strokeLinecap="round"
          filter="url(#needleGlow)"
          className="transition-all duration-700 ease-out"
        />

        {/* Center Pivot Point */}
        <circle cx={cx} cy={cy} r="4" fill="#0A0A0A" stroke={getStatusColor()} strokeWidth="2" />

        {/* Dynamic target beacon */}
        <circle
          cx={needleX}
          cy={needleY}
          r="2.5"
          fill={getStatusColor()}
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Axis bounds labels */}
      <div className="flex justify-between w-full px-2 text-[10px] font-mono text-neutral-500 -mt-2">
        <span>0.0%</span>
        <span className="text-amber-500/70">2.0σ</span>
        <span className="text-red-500/70">&gt;3.0σ</span>
        <span>5.0%</span>
      </div>
    </div>
  );
}
