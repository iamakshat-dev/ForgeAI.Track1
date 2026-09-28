'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  badge?: {
    label: string;
    variant: 'nominal' | 'warning' | 'critical' | 'info';
  };
  sparklineData?: number[];
  sparklineColor?: string;
  actionTooltip?: string;
  onClickAction?: () => void;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  subtitle,
  badge,
  sparklineData,
  sparklineColor = '#0070F3',
  actionTooltip = 'Inspect telemetry details',
  onClickAction,
  children,
}: MetricCardProps) {
  const getBadgeStyle = () => {
    switch (badge?.variant) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'nominal':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-neutral-800/60 text-neutral-300 border-neutral-700/40';
    }
  };

  return (
    <div className="relative group flex flex-col justify-between p-5 rounded-2xl bg-neutral-950/70 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] transition-all duration-300 shadow-sm hover:shadow-md">
      {/* Subtle ambient lighting accent on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 z-10">
        <span className="text-xs font-medium text-neutral-400 tracking-tight">{title}</span>
        <button
          onClick={onClickAction}
          title={actionTooltip}
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.2] text-neutral-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Middle Value */}
      <div className="my-3 z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold font-mono tracking-tight text-white">{value}</span>
          {badge && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getBadgeStyle()}`}
            >
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Custom children or sparkline footer */}
      <div className="z-10 mt-auto pt-2 border-t border-white/[0.04] flex items-center justify-between gap-3">
        <span className="text-[11px] font-mono text-neutral-500 truncate">{subtitle}</span>

        {sparklineData && sparklineData.length > 1 && (
          <div className="w-20 h-6 shrink-0">
            <Sparkline data={sparklineData} color={sparklineColor} />
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 6) - 3}
          r="2"
          fill={color}
        />
      )}
    </svg>
  );
}
