'use client';

import React, { useState, useRef } from 'react';
import { LiveLogStream } from '../components/live-log-stream';
import { AwsPayloadModal } from '../components/aws-payload-modal';
import { IncidentDetailModal } from '../components/incident-detail-modal';
import { AlertHistory } from '../components/alert-history';
import { ConfigSettings } from '../components/config-settings';
import { SinksStatus } from '../components/sinks-status';
import { SmoothScroll } from '../components/smooth-scroll';
import { useTelemetryStream } from '../hooks/use-telemetry-stream';
import { AnomalyAlert } from '../types/telemetry';
import { DetectorConfig } from '../types/config';
import {
  Activity,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Check,
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

  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'HISTORY' | 'SINKS' | 'CONFIG'>('DASHBOARD');
  const [windowScope, setWindowScope] = useState<'60s' | '300s'>('60s');
  const [showTooltip, setShowTooltip] = useState(true);

  // Modals for deep inspection
  const [inspectingAlert, setInspectingAlert] = useState<AnomalyAlert | null>(null);
  const [activeIncident, setActiveIncident] = useState<AnomalyAlert | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  // Clean 3-digit score matching the reference image (e.g. 832)
  const stabilityIndex = Math.max(720, Math.min(990, Math.round(990 - currentErrorRate * 3500)));

  const handleSaveConfig = (newConfig: DetectorConfig) => {
    console.log('Saved detector configuration:', newConfig);
  };

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#08090C] text-[#EDEDED] flex flex-col antialiased selection:bg-neutral-800 selection:text-white">
        {/* =========================================================================
            SUB-VIEW HEADER (ONLY WHEN NOT ON DASHBOARD)
            ========================================================================= */}
        {activeTab !== 'DASHBOARD' && (
          <div className="w-full bg-transparent px-6 sm:px-10 lg:px-14 pt-6 pb-2">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              <div
                className="flex items-center gap-2.5 cursor-pointer"
                onClick={() => setActiveTab('DASHBOARD')}
              >
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black shadow-sm">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold tracking-tight text-white font-[family-name:var(--font-montserrat)]">
                    ForgeAI
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    / Log Anomaly Detector
                  </span>
                </div>
              </div>

              {/* Navigation Pills */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('DASHBOARD')}
                  className="px-4 py-1.5 text-xs font-medium rounded-full bg-neutral-900 border border-white/[0.08] text-neutral-300 hover:text-white transition-all cursor-pointer font-[family-name:var(--font-montserrat)]"
                >
                  Live Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('HISTORY')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer font-[family-name:var(--font-montserrat)] ${
                    activeTab === 'HISTORY'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-neutral-900 border border-white/[0.08] text-neutral-300 hover:text-white'
                  }`}
                >
                  Alert History ({alerts.length})
                </button>
                <button
                  onClick={() => setActiveTab('SINKS')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer font-[family-name:var(--font-montserrat)] ${
                    activeTab === 'SINKS'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-neutral-900 border border-white/[0.08] text-neutral-300 hover:text-white'
                  }`}
                >
                  Sinks Status
                </button>
                <button
                  onClick={() => setActiveTab('CONFIG')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer font-[family-name:var(--font-montserrat)] ${
                    activeTab === 'CONFIG'
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'bg-neutral-900 border border-white/[0.08] text-neutral-300 hover:text-white'
                  }`}
                >
                  Settings & Config
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 1: LIVE DASHBOARD
            UPPER HALF: LIGHT-TO-BLACK GRADIENT FROM RIGHT WITH GOLDEN AMBER SUN FLARE
            ========================================================================= */}
        {activeTab === 'DASHBOARD' && (
          <>
            <section className="relative w-full bg-gradient-to-r from-[#F4F1EA] via-[#F4F1EA] lg:via-[#F4F1EA] lg:to-[#090A0E] text-neutral-900 pt-7 pb-14 px-6 sm:px-10 lg:px-14 overflow-hidden border-b border-white/[0.08]">
              {/* The Glowing Golden-Amber Sunbeam Flare coming from the right/center into the dark right side */}
              <div className="absolute top-[-50px] right-[10%] w-[680px] h-[550px] bg-gradient-to-br from-[#F59E0B]/40 via-[#EA580C]/25 to-transparent blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute top-[60px] right-[24%] w-[380px] h-[380px] bg-gradient-to-tr from-[#D97706]/35 via-[#FBBF24]/25 to-transparent blur-[80px] rounded-full pointer-events-none" />

              <div className="relative z-10 max-w-7xl mx-auto">
                {/* Brand & In-Canvas Navigation (no separate navbar) */}
                <div className="flex items-center justify-between gap-4 mb-9">
                  {/* Brand Logo & Name */}
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm">
                      <Activity className="w-4 h-4" />
                    </div>
                    <span className="text-base font-bold tracking-tight text-neutral-950 font-[family-name:var(--font-montserrat)]">
                      ForgeAI
                    </span>
                    <span className="text-xs text-neutral-500 font-mono">/ Telemetry</span>
                  </div>

                  {/* Navigation Pills (Karma / Credits / Money style sitting over the ambient backdrop) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('DASHBOARD')}
                      className="px-4 py-1.5 text-xs font-semibold rounded-full bg-black text-white shadow-md transition-all cursor-pointer font-[family-name:var(--font-montserrat)]"
                    >
                      Stream Health
                    </button>
                    <button
                      onClick={() => setActiveTab('HISTORY')}
                      className="px-4 py-1.5 text-xs font-medium rounded-full bg-white/80 border border-neutral-300 text-neutral-800 hover:bg-white transition-all cursor-pointer font-[family-name:var(--font-montserrat)]"
                    >
                      Alerts ({activeAnomaliesCount})
                    </button>
                    <button
                      onClick={() => setActiveTab('SINKS')}
                      className="px-4 py-1.5 text-xs font-medium rounded-full bg-white/80 border border-neutral-300 text-neutral-800 hover:bg-white transition-all cursor-pointer font-[family-name:var(--font-montserrat)]"
                    >
                      AWS Sinks
                    </button>
                    <button
                      onClick={() => setActiveTab('CONFIG')}
                      className="px-4 py-1.5 text-xs font-medium rounded-full bg-white/80 border border-neutral-300 text-neutral-800 hover:bg-white transition-all cursor-pointer font-[family-name:var(--font-montserrat)]"
                    >
                      Config
                    </button>
                  </div>
                </div>

                {/* Upper Deck Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  {/* Left Column: Headline, Scope Pills, Big Metric (no gauge), Sub-Cards */}
                  <div className="lg:col-span-6 flex flex-col justify-between">
                    <div>
                      {/* Headline with dark text gradient */}
                      <h1 className="text-4xl sm:text-[42px] font-bold tracking-tight text-gradient-dark font-[family-name:var(--font-montserrat)] mb-3 leading-tight">
                        Stream Stability
                      </h1>

                      {/* Scope filter pills */}
                      <div className="flex items-center gap-2 mb-6">
                        <button
                          onClick={() => setWindowScope('60s')}
                          className={`px-3.5 py-1 text-xs rounded-full border transition-all cursor-pointer font-[family-name:var(--font-montserrat)] ${
                            windowScope === '60s'
                              ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-sm'
                              : 'border-neutral-300 text-neutral-600 bg-white/70 hover:bg-white'
                          }`}
                        >
                          60s Window
                        </button>
                        <button
                          onClick={() => setWindowScope('300s')}
                          className={`px-3.5 py-1 text-xs rounded-full border transition-all cursor-pointer font-[family-name:var(--font-montserrat)] ${
                            windowScope === '300s'
                              ? 'border-neutral-900 bg-neutral-900 text-white font-medium shadow-sm'
                              : 'border-neutral-300 text-neutral-600 bg-white/70 hover:bg-white'
                          }`}
                        >
                          300s Rolling
                        </button>
                      </div>

                      {/* Big Metric Score: Clean, bold and uncluttered without the gauge */}
                      <div className="my-3">
                        <span className="text-xs font-mono text-neutral-500 font-medium block mb-1">
                          {currentZScore > 0 ? `+${currentZScore}σ` : `${currentZScore}σ`} vs baseline
                        </span>
                        <div className="flex items-baseline gap-4">
                          <span className="text-7xl sm:text-8xl font-bold font-[family-name:var(--font-montserrat)] tracking-tight text-gradient-dark leading-none">
                            {stabilityIndex}
                          </span>
                          <div className="flex flex-col text-xs text-neutral-500 leading-tight">
                            <span className="font-bold text-neutral-900 font-[family-name:var(--font-montserrat)] text-sm">
                              {currentErrorRate > 0.03
                                ? 'Critical'
                                : currentErrorRate > 0.015
                                ? 'Elevated'
                                : 'Excellent'}
                            </span>
                            <span className="text-neutral-500 mt-0.5">Checked Continuously</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Two Floating White Sub-Cards: Aligned horizontally & matching right column height */}
                    <div className="grid grid-cols-2 gap-4 mt-6">
                      {/* Card 1: Rolling Error Rate */}
                      <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-neutral-200/90 flex flex-col justify-between h-[145px]">
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
                        <div className="flex items-baseline justify-between mt-auto">
                          <span className="text-xs font-semibold text-neutral-500 font-[family-name:var(--font-montserrat)]">
                            Rolling Error
                          </span>
                          <span className="text-2xl font-bold font-mono tracking-tight text-neutral-950">
                            {(currentErrorRate * 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Card 2: Z-Score Deviation */}
                      <div className="bg-white rounded-[22px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-neutral-200/90 flex flex-col justify-between h-[145px]">
                        <div className="flex items-center justify-between">
                          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <button
                            onClick={resetNominal}
                            className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                            title="Reset Baseline"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-baseline justify-between mt-auto">
                          <span className="text-xs font-semibold text-neutral-500 font-[family-name:var(--font-montserrat)]">
                            Z-Score Dev
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

                  {/* Right Column: 2x2 Grid of cards with exact matching height h-[145px] */}
                  <div className="lg:col-span-6 grid grid-cols-2 gap-4">
                    {/* Card 1 (Top-Left): Frosted Dark Card */}
                    <div className="rounded-[22px] p-5 shadow-2xl bg-gradient-to-br from-[#2D3748]/90 via-[#1E293B]/95 to-[#0F172A]/95 text-white backdrop-blur-xl border border-white/20 flex flex-col justify-between h-[145px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-300 font-[family-name:var(--font-montserrat)]">
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
                        <div className="text-3xl font-bold font-mono tracking-tight text-white mb-1.5">
                          {(currentErrorRate * 100).toFixed(1)}%
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-white" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                        </div>
                      </div>
                    </div>

                    {/* Card 2 (Top-Right): Crisp White Card */}
                    <div
                      className="bg-white rounded-[22px] p-5 shadow-2xl border border-neutral-100 flex flex-col justify-between h-[145px] cursor-pointer hover:border-neutral-300 transition-colors"
                      onClick={() => setActiveTab('SINKS')}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-600 font-[family-name:var(--font-montserrat)]">
                          AWS Dispatch
                        </span>
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

                    {/* Card 3 (Bottom-Left): Ingest Rate with Sparkline */}
                    <div className="bg-white rounded-[22px] p-5 shadow-2xl border border-neutral-100 flex flex-col justify-between h-[145px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-600 font-[family-name:var(--font-montserrat)]">
                          Ingest Rate
                        </span>
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

                    {/* Card 4 (Bottom-Right): Buffer Health with Wave Sparkline */}
                    <div className="bg-white rounded-[22px] p-5 shadow-2xl border border-neutral-100 flex flex-col justify-between h-[145px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-neutral-600 font-[family-name:var(--font-montserrat)]">
                          Buffer Health
                        </span>
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

            {/* LOWER HALF: PURE DARK TELEMETRY WITH LUMINOUS GRADIENT HEADINGS */}
            <section className="w-full bg-[#08090C] py-10 px-6 sm:px-10 lg:px-14 flex-1">
              <div className="max-w-7xl mx-auto space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left: Sliding Window Error History */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-2xl font-bold tracking-tight text-gradient-luminous font-[family-name:var(--font-montserrat)]">
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

                    {/* Stem Chart with Y-Axis, Guidelines & Floating Tooltip */}
                    <div className="relative w-full h-[250px] bg-[#0C0E14] rounded-[22px] border border-white/[0.08] p-6 flex flex-col justify-between select-none">
                      <div className="relative flex-1 flex items-end">
                        {/* Y-Axis Labels */}
                        <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[11px] font-mono text-neutral-500 pr-4 select-none">
                          <span>5.0%</span>
                          <span>2.5%</span>
                          <span>0.0%</span>
                        </div>

                        {/* Horizontal Guidelines across chart */}
                        <div className="absolute left-12 right-0 top-1 border-b border-white/[0.05] border-dashed pointer-events-none" />
                        <div className="absolute left-12 right-0 top-1/2 -translate-y-1/2 border-b border-white/[0.05] border-dashed pointer-events-none" />
                        <div className="absolute left-12 right-0 bottom-3 border-b border-white/[0.05] border-dashed pointer-events-none" />

                        {/* Stems */}
                        <div className="ml-12 flex-1 h-full flex items-end justify-between gap-3 pt-6 pb-2">
                          {telemetryHistory.slice(-14).map((pt, idx) => {
                            const isSpike = pt.isSpike || pt.errorRate > 0.03;
                            const heightPct = Math.min(88, Math.max(35, (pt.errorRate / 0.05) * 85));

                            return (
                              <div
                                key={idx}
                                className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                                onClick={() => {
                                  if (alerts.length > 0) setActiveIncident(alerts[0]);
                                }}
                              >
                                <div
                                  className={`w-4 h-[2px] rounded-full transition-all ${
                                    isSpike
                                      ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'
                                      : 'bg-neutral-400'
                                  }`}
                                />
                                <div
                                  style={{ height: `${heightPct}%` }}
                                  className={`w-[1.5px] transition-all ${
                                    isSpike ? 'bg-orange-500' : 'bg-neutral-700 group-hover:bg-neutral-500'
                                  }`}
                                />
                              </div>
                            );
                          })}
                        </div>

                        {showTooltip && (
                          <div className="absolute top-1 right-4 p-3 rounded-xl bg-neutral-900/95 border border-white/[0.12] backdrop-blur-md shadow-2xl flex items-center gap-3 z-20">
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
                              <span className="text-[10px] text-neutral-400 block font-[family-name:var(--font-montserrat)]">
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

                      <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pt-3 border-t border-white/[0.06]">
                        <span>Sliding Window: 60s</span>
                        <span className="text-orange-400/80 font-medium">3.0σ Anomaly Boundary</span>
                        <span>Click stem for Incident Detail</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Active Alerts Feed (Height-aligned with Left Chart) */}
                  <div className="lg:col-span-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-2xl font-bold tracking-tight text-gradient-luminous font-[family-name:var(--font-montserrat)]">
                        Active Alerts
                      </h2>
                      <button
                        onClick={() => setActiveTab('HISTORY')}
                        className="text-xs font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        View all ({alerts.length}) →
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {alerts.slice(0, 2).map((alert, idx) => (
                        <div
                          key={alert.id}
                          className="p-5 rounded-[22px] bg-neutral-900/80 border border-white/[0.08] hover:border-white/[0.16] transition-all flex items-center justify-between gap-4 cursor-pointer h-[118px]"
                          onClick={() => setActiveIncident(alert)}
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
                                <span className="text-sm font-semibold text-white truncate font-[family-name:var(--font-montserrat)]">
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

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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

                {/* Bottom Live Log Stream Console with isolated internal scroll */}
                <div ref={terminalRef} className="pt-4">
                  <LiveLogStream
                    logs={logs}
                    isStreaming={isStreaming}
                    onToggleStreaming={() => setIsStreaming(!isStreaming)}
                  />
                </div>
              </div>
            </section>
          </>
        )}

        {/* =========================================================================
            VIEW 2: ALERT HISTORY TABLE VIEW
            ========================================================================= */}
        {activeTab === 'HISTORY' && (
          <div className="max-w-7xl w-full mx-auto px-6 sm:px-10 lg:px-14 py-8 flex-1">
            <AlertHistory
              alerts={alerts}
              onSelectAlert={(alt) => setActiveIncident(alt)}
              onAcknowledge={acknowledgeAlert}
            />
          </div>
        )}

        {/* =========================================================================
            VIEW 3: SINKS STATUS VIEW
            ========================================================================= */}
        {activeTab === 'SINKS' && (
          <div className="max-w-7xl w-full mx-auto px-6 sm:px-10 lg:px-14 py-8 flex-1">
            <SinksStatus />
          </div>
        )}

        {/* =========================================================================
            VIEW 4: SETTINGS OR CONFIG VIEW
            ========================================================================= */}
        {activeTab === 'CONFIG' && (
          <div className="max-w-7xl w-full mx-auto px-6 sm:px-10 lg:px-14 py-8 flex-1">
            <ConfigSettings onSaveConfig={handleSaveConfig} />
          </div>
        )}

        {/* =========================================================================
            INCIDENT DETAIL MODAL (EXPLAINABILITY & ZOOM CURVE FOR JUDGES)
            ========================================================================= */}
        <IncidentDetailModal
          alert={activeIncident}
          logs={logs}
          onClose={() => setActiveIncident(null)}
          onAcknowledge={acknowledgeAlert}
          onViewAwsPayload={(alt) => setInspectingAlert(alt)}
        />

        {/* AWS Raw Payload Inspector Modal */}
        <AwsPayloadModal
          alert={inspectingAlert}
          onClose={() => setInspectingAlert(null)}
        />
      </div>
    </SmoothScroll>
  );
}
