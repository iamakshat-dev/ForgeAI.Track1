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
  RefreshCw,
  Sparkles,
  Server,
  Cloud,
} from 'lucide-react';
import gsap from 'gsap';

export default function Home() {
  const {
    telemetryHistory,
    alerts,
    logs,
    isStreaming,
    setIsStreaming,
    isSimulatingSpike,
    triggerSpike,
    resetNominal,
    acknowledgeAlert,
    selectedWindow,
    setSelectedWindow,
    currentErrorRate,
    currentZScore,
    activeAnomaliesCount,
    reliabilityScore,
  } = useTelemetryStream();

  const [inspectingAlert, setInspectingAlert] = useState<AnomalyAlert | null>(null);
  const [activeTab, setActiveTab] = useState<'Telemetry' | 'Alerts' | 'AWS'>('Telemetry');
  const [windowScope, setWindowScope] = useState<'60s' | '300s'>('60s');
  const [hoveredPoint, setHoveredPoint] = useState<TelemetryDataPoint | null>(null);

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.inspo-fade', {
        opacity: 0,
        y: 10,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power2.out',
      });
    });

    return () => ctx.revert();
  }, []);

  const handleTraceLogs = () => {
    terminalRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-[#08090D] text-[#EDEDED] font-sans flex flex-col">
        {/* =========================================================================
            UPPER HALF: LIGHT TELEMETRY DECK WITH AMBER AMBIENT MESH (INSPIRATION LAYOUT)
            ========================================================================= */}
        <section className="relative w-full bg-[#F5F4F0] text-neutral-900 pt-7 pb-12 px-4 sm:px-8 lg:px-12 overflow-hidden border-b border-neutral-300/70">
          {/* Subtle warm amber ambient glow in center-right */}
          <div className="absolute top-0 right-1/4 w-[550px] h-[450px] bg-gradient-to-br from-[#FF9800]/35 via-[#F59E0B]/20 to-transparent blur-[85px] rounded-full pointer-events-none" />
          <div className="absolute top-1/4 right-1/3 w-[300px] h-[300px] bg-gradient-to-tr from-[#E65100]/20 via-[#FFA726]/15 to-transparent blur-[65px] rounded-full pointer-events-none" />

          <div className="relative z-10 max-w-7xl mx-auto">
            {/* Top Navigation Bar inside light surface */}
            <div className="flex items-center justify-between gap-4 mb-7">
              {/* Brand Logo & Project Name */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-white shadow-sm">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-bold tracking-tight text-neutral-950">
                    ForgeAI
                  </span>
                  <span className="text-xs font-mono text-neutral-500 font-medium">
                    / Log Anomaly Detector
                  </span>
                </div>
              </div>

              {/* Top Navigation Pills */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('Telemetry')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    activeTab === 'Telemetry'
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white/80 border border-neutral-300 text-neutral-700 hover:bg-white'
                  }`}
                >
                  Live Telemetry
                </button>
                <button
                  onClick={() => setActiveTab('Alerts')}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    activeTab === 'Alerts'
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white/80 border border-neutral-300 text-neutral-700 hover:bg-white'
                  }`}
                >
                  Alert Feed ({activeAnomaliesCount})
                </button>
                <button
                  onClick={() => {
                    setActiveTab('AWS');
                    if (alerts.length > 0) setInspectingAlert(alerts[0]);
                  }}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                    activeTab === 'AWS'
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-white/80 border border-neutral-300 text-neutral-700 hover:bg-white'
                  }`}
                >
                  AWS Pipeline
                </button>
              </div>
            </div>

            {/* Main Content Grid: Left Hero Metrics vs Right 2x2 Floating Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* -------------------------------------------------------------
                  LEFT COLUMN: Stability Index, Arc Gauge, and 2 Sub-Cards
                  ------------------------------------------------------------- */}
              <div className="lg:col-span-6 flex flex-col justify-between inspo-fade">
                {/* Title & Scope Pills */}
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-950 mb-3">
                  System Stability
                </h1>

                <div className="flex items-center gap-2 mb-6">
                  <button
                    onClick={() => setWindowScope('60s')}
                    className={`px-3 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                      windowScope === '60s'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                        : 'border-neutral-300 text-neutral-600 bg-white/70 hover:bg-white'
                    }`}
                  >
                    60s Window
                  </button>
                  <button
                    onClick={() => setWindowScope('300s')}
                    className={`px-3 py-1 text-xs rounded-full border transition-all cursor-pointer ${
                      windowScope === '300s'
                        ? 'border-neutral-900 bg-neutral-900 text-white font-medium'
                        : 'border-neutral-300 text-neutral-600 bg-white/70 hover:bg-white'
                    }`}
                  >
                    300s Rolling
                  </button>
                </div>

                {/* Big Metric + Radial Arc Gauge */}
                <div className="flex items-center justify-between gap-6 my-2">
                  <div>
                    <span className="text-xs font-mono text-neutral-500 block mb-0.5">
                      {currentZScore > 0 ? `+${currentZScore}σ` : `${currentZScore}σ`} vs baseline
                    </span>
                    <div className="text-6xl sm:text-7xl font-bold font-mono tracking-tighter text-neutral-950 leading-none">
                      {reliabilityScore}%
                    </div>
                    <span className="text-xs text-neutral-600 mt-2 block font-medium">
                      {currentErrorRate > 0.03
                        ? 'Critical Anomaly Detected'
                        : currentErrorRate > 0.015
                        ? 'Elevated Deviation'
                        : 'Nominal Baseline · Monitored Real-Time'}
                    </span>
                  </div>

                  {/* Clean SVG Arc Gauge */}
                  <div className="shrink-0">
                    <CleanGauge errorRate={currentErrorRate} />
                  </div>
                </div>

                {/* Two Floating White Cards Below */}
                <div className="grid grid-cols-2 gap-4 mt-7">
                  {/* Sub-Card 1: Rolling Error Rate */}
                  <div className="bg-white/95 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-neutral-200/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <button
                        onClick={triggerSpike}
                        className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                        title="Simulate Error Burst Spike"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 block">
                        Rolling Error Rate
                      </span>
                      <span className="text-2xl font-bold font-mono tracking-tight text-neutral-950">
                        {(currentErrorRate * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Sub-Card 2: Deviation Z-Score */}
                  <div className="bg-white/95 rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-neutral-200/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      </div>
                      <button
                        onClick={resetNominal}
                        className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                        title="Reset to Baseline"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-neutral-500 block">
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
                  RIGHT COLUMN: 2x2 Floating Cards on Amber Ambient Backdrop
                  ------------------------------------------------------------- */}
              <div className="lg:col-span-6 grid grid-cols-2 gap-4 inspo-fade">
                {/* Card 1: Frosted Gradient Mesh Card (Sliding Error Rate) */}
                <div className="relative rounded-2xl p-5 shadow-xl bg-gradient-to-br from-[#2D3748]/90 via-[#1A202C]/90 to-[#0F172A]/90 text-white backdrop-blur-md border border-white/20 flex flex-col justify-between min-h-[145px]">
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
                    {/* Dot status scale */}
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    </div>
                  </div>
                </div>

                {/* Card 2: AWS Dispatch Target */}
                <div className="bg-white/95 rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-neutral-200/80 flex flex-col justify-between min-h-[145px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600">AWS Dispatch</span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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

                {/* Card 3: Ingestion Rate with Sparkline */}
                <div className="bg-white/95 rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-neutral-200/80 flex flex-col justify-between min-h-[145px]">
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
                      <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                        <path
                          d="M 0 15 Q 15 5, 30 12 T 60 4"
                          fill="none"
                          stroke="#171717"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <circle cx="60" cy="4" r="2" fill="#171717" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Card 4: Stream Buffer Health */}
                <div className="bg-white/95 rounded-2xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.04)] border border-neutral-200/80 flex flex-col justify-between min-h-[145px]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-neutral-600">Buffer Health</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Zero Drop
                    </span>
                  </div>
                  <div>
                    <div className="text-3xl font-bold font-mono tracking-tight text-neutral-950">
                      99.9%
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] font-mono text-neutral-500">Lossless</span>
                      <svg className="w-16 h-5 overflow-visible" viewBox="0 0 60 20">
                        <path
                          d="M 0 12 Q 20 18, 35 8 T 60 10"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <circle cx="60" cy="10" r="2" fill="#10B981" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            LOWER HALF: DARK TELEMETRY HISTORY & ACTIVE ALERT FEED
            ========================================================================= */}
        <section className="w-full bg-[#08090D] py-10 px-4 sm:px-8 lg:px-12 flex-1">
          <div className="max-w-7xl mx-auto space-y-10">
            {/* Split: Sliding Error History on Left vs Alert Feed on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Error History */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                {/* Header & Window Filters */}
                <div className="flex items-center justify-between mb-5">
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

                {/* Telemetry Stem Bar Chart with Floating Anomaly Tooltip */}
                <div className="relative w-full aspect-[640/220] min-h-[220px] bg-[#0E1117] rounded-2xl border border-white/[0.08] p-5 select-none">
                  {/* Stem columns */}
                  <div className="h-full flex items-end justify-between gap-2 pt-8 pb-4 px-2">
                    {telemetryHistory.slice(-18).map((pt, idx) => {
                      const isSpike = pt.isSpike || pt.errorRate > 0.03;
                      const heightPct = Math.min(100, Math.max(15, (pt.errorRate / 0.05) * 100));

                      return (
                        <div
                          key={idx}
                          className="relative flex-1 flex flex-col items-center justify-end h-full group cursor-pointer"
                          onMouseEnter={() => setHoveredPoint(pt)}
                          onMouseLeave={() => setHoveredPoint(null)}
                          onClick={handleTraceLogs}
                        >
                          {/* Accent Cap (Orange on spikes as in reference photo) */}
                          <div
                            className={`w-full max-w-[12px] rounded-t-sm transition-all ${
                              isSpike ? 'bg-orange-500 h-1.5' : 'bg-neutral-600 h-1'
                            }`}
                          />
                          {/* Stem Body */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[12px] transition-all ${
                              isSpike
                                ? 'bg-orange-500/25 border-x border-orange-500/40'
                                : 'bg-white/[0.06] border-x border-white/[0.08] group-hover:bg-white/[0.12]'
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Floating Inspection Tooltip Card */}
                  <div className="absolute top-4 left-1/3 p-3 rounded-xl bg-neutral-900/95 border border-white/[0.12] backdrop-blur-md shadow-2xl flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full bg-orange-500" />
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold font-mono text-white">
                          {hoveredPoint
                            ? `${(hoveredPoint.errorRate * 100).toFixed(2)}%`
                            : `${(currentErrorRate * 100).toFixed(2)}%`}
                        </span>
                        <span className="text-[10px] text-orange-400 font-mono font-medium">
                          {hoveredPoint ? `+${hoveredPoint.zScore}σ` : `+${currentZScore}σ`}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block">
                        {currentErrorRate > 0.03
                          ? 'Critical 3.0σ boundary breached'
                          : 'Nominal sliding window rate'}
                      </span>
                    </div>
                  </div>

                  {/* Baseline boundary footer */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-2 border-t border-white/[0.06]">
                    <span>Sliding Window: 60s</span>
                    <span className="text-orange-400/80">Anomaly Spike Threshold: 3.0σ</span>
                    <span>Lossless Buffer</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Active Anomaly Alerts */}
              <div className="lg:col-span-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-semibold text-white tracking-tight">Active Alerts</h2>
                  <span className="text-xs font-mono text-neutral-400">
                    {alerts.length} generated
                  </span>
                </div>

                {/* Alert Cards with AWS Dispatch Badges */}
                <div className="space-y-3">
                  {alerts.slice(0, 2).map((alert, idx) => (
                    <div
                      key={alert.id}
                      className="p-4 rounded-2xl bg-neutral-900/80 border border-white/[0.08] hover:border-white/[0.16] transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            idx === 0
                              ? 'bg-gradient-to-br from-neutral-800 to-neutral-700 text-white'
                              : 'bg-gradient-to-br from-emerald-950 to-neutral-800 text-emerald-400'
                          }`}
                        >
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white">
                              {alert.sourceService}
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                alert.severity === 'CRITICAL'
                                  ? 'bg-red-500/20 text-red-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </div>
                          <span className="text-xs text-neutral-400 block mt-0.5 line-clamp-1">
                            {alert.reason}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInspectingAlert(alert)}
                          className="px-2.5 py-1 text-[11px] font-mono rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 border border-white/[0.08] transition-colors cursor-pointer"
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
            <div ref={terminalRef} className="pt-2">
              <LiveLogStream
                logs={logs}
                isStreaming={isStreaming}
                onToggleStreaming={() => setIsStreaming(!isStreaming)}
              />
            </div>
          </div>
        </section>

        {/* AWS Payload Modal */}
        <AwsPayloadModal
          alert={inspectingAlert}
          onClose={() => setInspectingAlert(null)}
        />
      </div>
    </SmoothScroll>
  );
}
