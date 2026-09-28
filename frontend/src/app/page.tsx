'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CleanGauge } from '../components/clean-gauge';
import { LiveLogStream } from '../components/live-log-stream';
import { AwsPayloadModal } from '../components/aws-payload-modal';
import { SmoothScroll } from '../components/smooth-scroll';
import { useTelemetryStream } from '../hooks/use-telemetry-stream';
import { AnomalyAlert, TelemetryDataPoint } from '../types/telemetry';
import {
  Activity,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Check,
  Server,
  Cloud,
  X,
} from 'lucide-react';

export default function Home() {
  const {
    telemetryHistory,
    alerts,
    logs,
    isStreaming,
    setIsStreaming,
    triggerSpike,
    resetNominal,
    acknowledgeAlert,
    selectedWindow,
    setSelectedWindow,
    currentErrorRate,
    currentZScore,
    activeAnomaliesCount,
  } = useTelemetryStream();

  const [inspectingAlert, setInspectingAlert] = useState<AnomalyAlert | null>(null);
  const [activeTab, setActiveTab] = useState<'Karma' | 'Credits' | 'Money'>('Karma');
  const [scopeFilter, setScopeFilter] = useState<'60s' | '300s'>('60s');
  const [showTooltip, setShowTooltip] = useState(true);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Compute a clean 3-digit score matching the reference image (e.g. 832)
  const stabilityIndex = Math.max(720, Math.min(990, Math.round(990 - currentErrorRate * 3500)));

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#08090C] text-[#EDEDED] font-sans flex flex-col antialiased">
        {/* =========================================================================
            UPPER HALF: LIGHT DECK WITH AMBER GLOW (PIXEL-PERFECT INSPIRATION LAYOUT)
            ========================================================================= */}
        <section className="relative w-full bg-[#F5F4F0] text-neutral-900 pt-8 pb-14 px-6 sm:px-10 lg:px-14 overflow-hidden border-b border-neutral-300">
          {/* Warm Amber Glowing Ambient Backdrop centered behind the right cards */}
          <div className="absolute top-[-30px] right-[20%] w-[580px] h-[480px] bg-gradient-to-br from-[#F59E0B]/35 via-[#F97316]/25 to-transparent blur-[90px] rounded-full pointer-events-none" />
          <div className="absolute top-[80px] right-[32%] w-[320px] h-[320px] bg-gradient-to-tr from-[#EA580C]/20 via-[#FBBF24]/20 to-transparent blur-[70px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between gap-4 mb-9">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white">
                  <Activity className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold tracking-tight text-neutral-950 font-sans">
                  ForgeAI
                </span>
                <span className="text-xs text-neutral-400 font-mono">/ Telemetry</span>
              </div>

              {/* Top Navigation Pills (Karma / Credits / Money style) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('Karma')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    activeTab === 'Karma'
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white/80 border border-neutral-300 text-neutral-700 hover:bg-white'
                  }`}
                >
                  Stream Health
                </button>
                <button
                  onClick={() => setActiveTab('Credits')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    activeTab === 'Credits'
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white/80 border border-neutral-300 text-neutral-700 hover:bg-white'
                  }`}
                >
                  Alerts ({activeAnomaliesCount})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('Money');
                    if (alerts.length > 0) setInspectingAlert(alerts[0]);
                  }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    activeTab === 'Money'
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white/80 border border-neutral-300 text-neutral-700 hover:bg-white'
                  }`}
                >
                  AWS Pipeline
                </button>
              </div>
            </div>

            {/* Main Upper Grid: Left Hero vs Right 2x2 Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* -------------------------------------------------------------
                  LEFT COLUMN: Headline, Pills, Focal Number + Gauge, Sub-Cards
                  ------------------------------------------------------------- */}
              <div className="lg:col-span-6 flex flex-col justify-between">
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight text-neutral-950 mb-3">
                    Stream Stability
                  </h1>

                  {/* Scope filter pills */}
                  <div className="flex items-center gap-2 mb-8">
                    <button
                      onClick={() => setScopeFilter('60s')}
                      className={`px-3.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                        scopeFilter === '60s'
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-300 text-neutral-600 bg-white/70 hover:bg-white'
                      }`}
                    >
                      60s Window
                    </button>
                    <button
                      onClick={() => setScopeFilter('300s')}
                      className={`px-3.5 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                        scopeFilter === '300s'
                          ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                          : 'border-neutral-300 text-neutral-600 bg-white/70 hover:bg-white'
                      }`}
                    >
                      300s Rolling
                    </button>
                  </div>

                  {/* Big Number and Gauge Placed Directly Side-by-Side */}
                  <div className="flex items-center gap-6 my-2">
                    {/* Big Metric Display */}
                    <div>
                      <span className="text-xs font-mono text-neutral-500 font-medium block mb-1">
                        {currentZScore > 0 ? `+${currentZScore}σ` : `${currentZScore}σ`} vs baseline
                      </span>
                      <div className="flex items-baseline gap-3">
                        <span className="text-6xl sm:text-7xl font-bold font-mono tracking-tight text-neutral-950 leading-none">
                          {stabilityIndex}
                        </span>
                        <div className="flex flex-col text-[11px] text-neutral-500 leading-tight">
                          <span className="font-semibold text-neutral-800">
                            {currentErrorRate > 0.03
                              ? 'Critical'
                              : currentErrorRate > 0.015
                              ? 'Elevated'
                              : 'Excellent'}
                          </span>
                          <span>Checked Continuously</span>
                        </div>
                      </div>
                    </div>

                    {/* Radial Arc Gauge - sits immediately next to the number */}
                    <div className="shrink-0 pl-2">
                      <CleanGauge errorRate={currentErrorRate} />
                    </div>
                  </div>
                </div>

                {/* Two Floating White Sub-Cards (Net Worth & Total Debt counterpart) */}
                <div className="grid grid-cols-2 gap-4 mt-10">
                  {/* Card 1: Rolling Error Rate */}
                  <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/90 flex flex-col justify-between h-[125px]">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                        <Activity className="w-4 h-4" />
                      </div>
                      <button
                        onClick={triggerSpike}
                        className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                        title="Simulate Error Burst Spike"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 block mb-0.5">
                        Rolling Error Rate
                      </span>
                      <span className="text-2xl font-bold font-mono tracking-tight text-neutral-950">
                        {(currentErrorRate * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Card 2: Z-Score Deviation */}
                  <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/90 flex flex-col justify-between h-[125px]">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      </div>
                      <button
                        onClick={resetNominal}
                        className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                        title="Reset Baseline"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 block mb-0.5">
                        Z-Score Deviation
                      </span>
                      <span
                        className={`text-2xl font-bold font-mono tracking-tight ${
                          currentZScore >= 3 ? 'text-red-600' : 'text-neutral-950'
                        }`}
                      >
                        {currentZScore > 0 ? `+${currentZScore}` : currentZScore}σ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  RIGHT COLUMN: 2x2 Perfectly Symmetrical Floating Cards
                  ------------------------------------------------------------- */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                {/* Card 1 (Top-Left): Frosted Dark Card (Credit Card Use counterpart) */}
                <div className="rounded-[22px] p-5 shadow-xl bg-gradient-to-br from-[#334155]/95 via-[#1E293B]/95 to-[#0F172A]/95 text-white backdrop-blur-md border border-white/20 flex flex-col justify-between h-[155px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-300">
                      Sliding Error (60s)
                    </span>
                    <button
                      onClick={triggerSpike}
                      className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Inject Spike"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tracking-tight text-white mb-2">
                      {(currentErrorRate * 100).toFixed(1)}%
                    </div>
                    {/* Dot status indicator from reference image */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    </div>
                  </div>
                </div>

                {/* Card 2 (Top-Right): Pure Crisp White Card (Payment History counterpart) */}
                <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/90 flex flex-col justify-between h-[155px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600">AWS Dispatch</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tracking-tight text-neutral-950">
                      100%
                    </div>
                    <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
                      SNS & CloudWatch
                    </span>
                  </div>
                </div>

                {/* Card 3 (Bottom-Left): White Card with Multi-Peak Sparkline (Credit Age counterpart) */}
                <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/90 flex flex-col justify-between h-[155px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600">Ingest Rate</span>
                    <button
                      onClick={() => setIsStreaming(!isStreaming)}
                      className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:scale-105 transition-all cursor-pointer"
                      title="Toggle Streaming"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tracking-tight text-neutral-950">
                      1,420
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] font-mono text-neutral-500">lines / sec</span>
                      {/* Multi-peak sparkline with small peak dots matching reference image */}
                      <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24">
                        <path
                          d="M 2 18 L 18 10 L 32 16 L 46 6 L 62 14 L 76 4"
                          fill="none"
                          stroke="#18181B"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle cx="18" cy="10" r="2" fill="#18181B" />
                        <circle cx="46" cy="6" r="2" fill="#18181B" />
                        <circle cx="76" cy="4" r="2" fill="#18181B" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card 4 (Bottom-Right): White Card with Wave Sparkline (Total Accounts counterpart) */}
                <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-neutral-200/90 flex flex-col justify-between h-[155px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600">Buffer Health</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      Zero Drop
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tracking-tight text-neutral-950">
                      99.9%
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] font-mono text-neutral-500">Lossless Stream</span>
                      {/* Wave sparkline with peak dots matching reference image */}
                      <svg className="w-20 h-6 overflow-visible" viewBox="0 0 80 24">
                        <path
                          d="M 2 16 Q 16 6, 28 14 T 54 8 T 76 12"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <circle cx="54" cy="8" r="2" fill="#10B981" />
                        <circle cx="76" cy="12" r="2" fill="#10B981" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            LOWER HALF: PURE DARK TELEMETRY & ACTIVE INCIDENTS (MATCHING SCORE HISTORY)
            ========================================================================= */}
        <section className="w-full bg-[#08090C] py-10 px-6 sm:px-10 lg:px-14 flex-1">
          <div className="max-w-7xl mx-auto space-y-10">
            {/* Split: Error History vs Active Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* -------------------------------------------------------------
                  LEFT: Score History Counterpart (Sliding Window Error History)
                  ------------------------------------------------------------- */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                {/* Header with Title and Time Window Filters */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white tracking-tight">
                    Sliding Window Error History
                  </h2>
                  <div className="flex items-center gap-1.5 p-1 rounded-full bg-neutral-900 border border-white/[0.08]">
                    {['1m', '5m', '15m', '1h', 'Live'].map((win) => (
                      <button
                        key={win}
                        onClick={() => setSelectedWindow(win)}
                        className={`px-3 py-1 text-xs font-mono rounded-full transition-colors cursor-pointer ${
                          selectedWindow === win
                            ? 'bg-neutral-800 text-white font-semibold'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {win}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart Area with Real Stems, Y-Axis labels, and Floating Card */}
                <div className="relative w-full h-[240px] bg-[#0C0E14] rounded-[22px] border border-white/[0.08] p-6 flex flex-col justify-between select-none">
                  {/* Chart Body with Left Y-Axis and Stem Bars */}
                  <div className="relative flex-1 flex items-end">
                    {/* Y-Axis scale labels from reference image (850, 800, 750) */}
                    <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[11px] font-mono text-neutral-500 pr-4 select-none">
                      <span>5.0%</span>
                      <span>2.5%</span>
                      <span>0.0%</span>
                    </div>

                    {/* Stem Bars Container */}
                    <div className="ml-12 flex-1 h-full flex items-end justify-between gap-3 pt-6 pb-2">
                      {telemetryHistory.slice(-14).map((pt, idx) => {
                        const isSpike = pt.isSpike || pt.errorRate > 0.03;
                        // Stem height between 35% and 85% for authentic visual weight
                        const heightPct = Math.min(88, Math.max(35, (pt.errorRate / 0.05) * 85));

                        return (
                          <div
                            key={idx}
                            className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                            onClick={() => terminalRef.current?.scrollIntoView({ behavior: 'smooth' })}
                          >
                            {/* Horizontal Cap at Top of Stem (Orange for spike, white/gray for normal) */}
                            <div
                              className={`w-4 h-[2px] rounded-full transition-all ${
                                isSpike
                                  ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                                  : 'bg-neutral-400'
                              }`}
                            />
                            {/* Vertical Line Stem */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-[1.5px] transition-all ${
                                isSpike ? 'bg-orange-500/80' : 'bg-neutral-700 group-hover:bg-neutral-500'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    {/* Floating Inspection Card (Exact match of `816, moderate credit score` card in image 1) */}
                    {showTooltip && (
                      <div className="absolute top-2 left-1/3 p-3 rounded-xl bg-neutral-900/95 border border-white/[0.12] backdrop-blur-md shadow-2xl flex items-center gap-3 z-20">
                        <div className="w-1.5 h-6 rounded-full bg-orange-500" />
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-bold font-mono text-white">
                              {(currentErrorRate * 100).toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-orange-400 font-mono font-medium">
                              +{currentZScore}σ
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 block">
                            {currentErrorRate > 0.03
                              ? 'Critical threshold breached'
                              : 'Nominal sliding window rate'}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowTooltip(false)}
                          className="text-neutral-500 hover:text-white transition-colors p-0.5 cursor-pointer ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Chart Subtitle Footer */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-3 border-t border-white/[0.06]">
                    <span>Sliding Window: 60s</span>
                    <span className="text-orange-400/80">3.0σ Anomaly Boundary</span>
                    <span>Zero Data Loss</span>
                  </div>
                </div>
              </div>

              {/* -------------------------------------------------------------
                  RIGHT: Credit Offers Counterpart (Active Incident Alerts)
                  ------------------------------------------------------------- */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                {/* Header with Title and Count indicator */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white tracking-tight">Active Alerts</h2>
                  <span className="text-xs font-mono text-neutral-400">
                    {alerts.length} active breaches
                  </span>
                </div>

                {/* Dark Frosted Incident Cards (styled like Goldman Sachs & Bank of America in image 1) */}
                <div className="space-y-3">
                  {alerts.slice(0, 2).map((alert, idx) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-[20px] bg-neutral-900/80 border border-white/[0.08] hover:border-white/[0.16] transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            idx === 0
                              ? 'bg-gradient-to-br from-neutral-800 to-neutral-700 text-white'
                              : 'bg-gradient-to-br from-emerald-950 to-neutral-800 text-emerald-400'
                          }`}
                        >
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">
                              {alert.sourceService}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                                alert.severity === 'CRITICAL'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 block mt-0.5 truncate">
                            {alert.reason}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setInspectingAlert(alert)}
                          className="px-3 py-1 text-xs font-mono rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border border-white/[0.08] transition-colors cursor-pointer"
                        >
                          Payload
                        </button>
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center border transition-colors cursor-pointer ${
                            alert.acknowledged
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-white/[0.04] text-neutral-400 hover:text-white border-white/[0.08]'
                          }`}
                          title="Acknowledge Alert"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Live Log Stream Console */}
            <div ref={terminalRef} className="pt-4">
              <LiveLogStream
                logs={logs}
                isStreaming={isStreaming}
                onToggleStreaming={() => setIsStreaming(!isStreaming)}
              />
            </div>
          </div>
        </section>

        {/* AWS Payload Inspector Modal */}
        <AwsPayloadModal
          alert={inspectingAlert}
          onClose={() => setInspectingAlert(null)}
        />
      </div>
    </SmoothScroll>
  );
}
