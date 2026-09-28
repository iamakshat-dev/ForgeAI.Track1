'use client';

import React, { useState } from 'react';
import { TelemetryDataPoint } from '../types/telemetry';

interface TelemetryChartProps {
  data: TelemetryDataPoint[];
  selectedWindow: string;
  onSelectWindow: (w: string) => void;
  onInspectSpike?: (point: TelemetryDataPoint) => void;
}

export function TelemetryChart({
  data,
  selectedWindow,
  onSelectWindow,
  onInspectSpike,
}: TelemetryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryDataPoint | null>(null);

  // Chart dimensions
  const width = 640;
  const height = 220;
  const padding = { top: 25, right: 30, bottom: 35, left: 45 };

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  // Compute dynamic scale
  const maxDataRate = Math.max(...data.map((d) => d.errorRate), 0.05);
  const maxY = Math.ceil(maxDataRate * 120) / 100; // e.g. 0.06

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left;
    return padding.left + (index / (data.length - 1)) * innerWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(0, Math.min(val, maxY));
    return padding.top + innerHeight - (clamped / maxY) * innerHeight;
  };

  // Build SVG path for Error Rate
  const pathD = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.errorRate)}`)
    .join(' ');

  // Baseline lines
  const baselineMean = data[0]?.baselineMean || 0.0035;
  const baselineUpper = data[0]?.baselineUpperBand || 0.0051;
  const baselineCritical = data[0]?.baselineCriticalBand || 0.0059;

  const yBaselineMean = getY(baselineMean);
  const yBaselineUpper = getY(baselineUpper);
  const yBaselineCritical = getY(baselineCritical);

  // Area under error rate path
  const areaD = `${pathD} L ${getX(data.length - 1)} ${padding.top + innerHeight} L ${getX(0)} ${padding.top + innerHeight} Z`;

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Chart Header & Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold tracking-tight text-white">Sliding Window Error Rate</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Sliding: 60s
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Rolling error percentage vs dynamic baseline envelope (μ ± 2.0σ)
          </p>
        </div>

        {/* Time Window Pills */}
        <div className="flex items-center p-0.5 rounded-full bg-neutral-900 border border-white/[0.08]">
          {['1m', '5m', '15m', '1h', 'Live'].map((win) => (
            <button
              key={win}
              onClick={() => onSelectWindow(win)}
              className={`px-2.5 py-1 text-xs font-mono rounded-full transition-colors cursor-pointer ${
                selectedWindow === win
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {win}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full aspect-[640/220] min-h-[200px] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0070F3" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0070F3" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="spikeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + innerHeight * (1 - pct);
            const valLabel = (maxY * pct * 100).toFixed(1) + '%';
            return (
              <g key={idx}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + innerWidth}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-neutral-500"
                >
                  {valLabel}
                </text>
              </g>
            );
          })}

          {/* Shaded Normal Baseline Envelope (Mean to 2σ) */}
          <rect
            x={padding.left}
            y={yBaselineUpper}
            width={innerWidth}
            height={Math.max(2, yBaselineMean - yBaselineUpper)}
            fill="#06B6D4"
            fillOpacity="0.06"
          />

          {/* Baseline Mean Guideline */}
          <line
            x1={padding.left}
            y1={yBaselineMean}
            x2={padding.left + innerWidth}
            y2={yBaselineMean}
            stroke="#06B6D4"
            strokeWidth="1.2"
            strokeDasharray="3 3"
            strokeOpacity="0.8"
          />
          <text
            x={padding.left + innerWidth + 5}
            y={yBaselineMean + 3}
            className="text-[9px] font-mono fill-cyan-400/80"
          >
            μ
          </text>

          {/* 3-Sigma Critical Threshold Line */}
          <line
            x1={padding.left}
            y1={yBaselineCritical}
            x2={padding.left + innerWidth}
            y2={yBaselineCritical}
            stroke="#EF4444"
            strokeWidth="1"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
          />
          <text
            x={padding.left + innerWidth + 5}
            y={yBaselineCritical + 3}
            className="text-[9px] font-mono fill-red-400/70"
          >
            3σ
          </text>

          {/* Area fill under curve */}
          <path d={areaD} fill="url(#rateGradient)" />

          {/* Main Error Rate Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#0070F3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Spike Stem Columns & Anomaly Pins */}
          {data.map((pt, i) => {
            if (!pt.isSpike) return null;
            const cx = getX(i);
            const cy = getY(pt.errorRate);
            const baseY = padding.top + innerHeight;

            return (
              <g
                key={i}
                className="cursor-pointer group"
                onClick={() => onInspectSpike?.(pt)}
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Stem line */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx}
                  y2={baseY}
                  stroke="#EF4444"
                  strokeWidth="2"
                  strokeDasharray="2 2"
                  className="opacity-75 group-hover:opacity-100 transition-opacity"
                />
                {/* Outer pulsing ring */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="7"
                  fill="#EF4444"
                  fillOpacity="0.2"
                  className="animate-ping"
                />
                {/* Solid anomaly pin */}
                <circle
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill="#EF4444"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                {/* Indicator label above pin */}
                <text
                  x={cx}
                  y={cy - 10}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-red-400 font-bold"
                >
                  +{pt.zScore}σ
                </text>
              </g>
            );
          })}

          {/* Interactive Data points on hover or latest */}
          {data.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.errorRate);

            return (
              <circle
                key={`pt-${i}`}
                cx={cx}
                cy={cy}
                r="3"
                className="fill-white opacity-0 hover:opacity-100 cursor-pointer transition-opacity"
                onMouseEnter={() => setHoveredPoint(pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}

          {/* X Axis Time Labels */}
          {data.length > 0 &&
            [0, Math.floor(data.length / 2), data.length - 1].map((idx) => {
              const pt = data[idx];
              if (!pt) return null;
              return (
                <text
                  key={`time-${idx}`}
                  x={getX(idx)}
                  y={padding.top + innerHeight + 18}
                  textAnchor={idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle'}
                  className="text-[10px] font-mono fill-neutral-500"
                >
                  {pt.timeLabel}
                </text>
              );
            })}
        </svg>

        {/* Floating Tooltip Card (Styled like inspiration image) */}
        {hoveredPoint && (
          <div
            className="absolute top-2 left-14 z-30 p-3 rounded-xl bg-neutral-900/95 border border-white/[0.12] backdrop-blur-md shadow-2xl transition-all"
            style={{ minWidth: '220px' }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-1.5 mb-2">
              <span className="text-[11px] font-mono text-neutral-400">{hoveredPoint.timeLabel}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-medium ${
                  hoveredPoint.isSpike
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300'
                }`}
              >
                {hoveredPoint.isSpike ? 'CRITICAL SPIKE' : 'NOMINAL'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Error Rate:</span>
                <span className="text-sm font-semibold font-mono text-white">
                  {(hoveredPoint.errorRate * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Deviation Z-Score:</span>
                <span
                  className={`text-xs font-mono font-medium ${
                    hoveredPoint.zScore >= 3 ? 'text-red-400' : 'text-cyan-400'
                  }`}
                >
                  {hoveredPoint.zScore > 0 ? `+${hoveredPoint.zScore}` : hoveredPoint.zScore}σ
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-neutral-400">Baseline (μ):</span>
                <span className="text-xs font-mono text-neutral-400">
                  {(hoveredPoint.baselineMean * 100).toFixed(2)}%
                </span>
              </div>
              {hoveredPoint.spikeReason && (
                <div className="pt-1.5 mt-1 border-t border-white/[0.06] text-[10px] text-amber-300/90 leading-tight">
                  {hoveredPoint.spikeReason}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center gap-4 pt-3 mt-2 border-t border-white/[0.06] text-[11px] font-mono text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#0070F3] rounded-full inline-block" />
          <span>Rolling Error Rate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#06B6D4] border-b border-dashed border-[#06B6D4] inline-block" />
          <span>Baseline μ (24h EMA)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[#EF4444] border-b border-dashed border-[#EF4444] inline-block" />
          <span>3.0σ Critical Threshold</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto text-neutral-500">
          <span>Click any pin to trace logs</span>
        </div>
      </div>
    </div>
  );
}
