'use client';

import React from 'react';
import { Activity, Radio, Cpu, Bell, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

interface NavbarProps {
  connectionState: 'WEBSOCKET' | 'POLLING' | 'CONNECTING';
  latencyMs: number;
  activeAnomaliesCount: number;
  onResetNominal: () => void;
  onTriggerSpike: () => void;
  isSimulatingSpike: boolean;
}

export function Navbar({
  connectionState,
  latencyMs,
  activeAnomaliesCount,
  onResetNominal,
  onTriggerSpike,
  isSimulatingSpike,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-black/75 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/[0.12] flex items-center justify-center shadow-inner">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-white font-sans">
                SpectraLog
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                v1.2.4
              </span>
            </div>
            <span className="text-[10px] font-mono text-neutral-400">
              Real-Time Sliding Window Anomaly Engine
            </span>
          </div>
        </div>

        {/* Live Ingest & Connection Pills */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Connection Status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/80 border border-white/[0.08] text-[11px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionState === 'WEBSOCKET'
                  ? 'bg-emerald-400 animate-pulse'
                  : connectionState === 'POLLING'
                  ? 'bg-amber-400'
                  : 'bg-neutral-500'
              }`}
            />
            <span className="text-neutral-300">
              {connectionState === 'WEBSOCKET' ? 'WEBSOCKET LIVE' : 'POLLING'}
            </span>
            <span className="text-neutral-500">({latencyMs}ms)</span>
          </div>

          {/* Active Anomalies Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              activeAnomaliesCount > 0
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-neutral-900/80 border-white/[0.08] text-neutral-400'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{activeAnomaliesCount} Active Breaches</span>
          </div>

          {/* AWS Ingest Target */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900/80 border border-white/[0.08] text-[11px] font-mono text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
            <span>AWS SNS & CloudWatch</span>
          </div>
        </div>

        {/* SRE Demo Controls (Direct Spike Triggering) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetNominal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/[0.08] transition-colors cursor-pointer"
            title="Reset sliding window to normal baseline (μ=0.35%)"
          >
            <RefreshCw className="w-3 h-3 text-neutral-400" />
            <span>Reset Baseline</span>
          </button>

          <button
            onClick={onTriggerSpike}
            disabled={isSimulatingSpike}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 text-xs font-mono font-medium rounded-full border transition-all cursor-pointer ${
              isSimulatingSpike
                ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse'
                : 'bg-white text-black hover:bg-neutral-200 border-white shadow-sm'
            }`}
            title="Inject an error spike into the sliding window to evaluate detection"
          >
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>{isSimulatingSpike ? 'SPIKE INJECTED' : 'Inject Error Spike'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
