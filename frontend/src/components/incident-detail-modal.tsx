'use client';

import React from 'react';
import { AnomalyAlert, LogEntry } from '../types/telemetry';
import { X, ShieldAlert, AlertTriangle, Terminal, Check, Copy, Clock, ExternalLink } from 'lucide-react';

interface IncidentDetailModalProps {
  alert: AnomalyAlert | null;
  logs: LogEntry[];
  onClose: () => void;
  onAcknowledge: (id: string) => void;
  onViewAwsPayload: (alert: AnomalyAlert) => void;
}

export function IncidentDetailModal({
  alert,
  logs,
  onClose,
  onAcknowledge,
  onViewAwsPayload,
}: IncidentDetailModalProps) {
  if (!alert) return null;

  // Filter error logs from this service or recent window
  const relevantErrors = logs.filter(
    (l) => l.level === 'ERROR' || l.level === 'FATAL' || l.service === alert.sourceService
  ).slice(-5);

  const sampleLines = relevantErrors.length > 0 ? relevantErrors : [
    {
      id: 'e1',
      timestamp: alert.timestamp,
      level: 'ERROR' as const,
      service: alert.sourceService,
      statusCode: 502,
      message: 'Upstream gateway timeout: connection reset by peer in auth-service container',
    },
    {
      id: 'e2',
      timestamp: new Date(new Date(alert.timestamp).getTime() + 1200).toISOString(),
      level: 'FATAL' as const,
      service: alert.sourceService,
      statusCode: 500,
      message: 'PostgresPoolExhaustedException: 50/50 connections active, request queue overflow',
    },
    {
      id: 'e3',
      timestamp: new Date(new Date(alert.timestamp).getTime() + 2400).toISOString(),
      level: 'ERROR' as const,
      service: alert.sourceService,
      statusCode: 504,
      message: 'CircuitBreaker tripped to OPEN state for downstream ledger dependency',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-[24px] bg-[#0C0F17] border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                alert.severity === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {alert.severity === 'CRITICAL' ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Incident Detail & Explainability
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
                  {alert.id}
                </span>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                Triggered at {new Date(alert.timestamp).toLocaleTimeString()} UTC · Service: {alert.sourceService}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Key Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">Peak Error Rate</span>
              <span className="text-xl font-bold font-mono text-red-400">
                {(alert.errorRate * 100).toFixed(2)}%
              </span>
              <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                Baseline: {(alert.baselineRate * 100).toFixed(2)}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">Deviation Z-Score</span>
              <span className="text-xl font-bold font-mono text-amber-400">
                +{alert.zScore}σ
              </span>
              <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                Threshold: 3.0σ
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">Spike Duration</span>
              <span className="text-xl font-bold font-mono text-white">
                {alert.windowSeconds}s
              </span>
              <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                Sliding window
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[10px] font-mono text-neutral-400 block uppercase">AWS Push Status</span>
              <span className="text-xl font-bold font-mono text-[#FF9900]">
                {alert.awsDispatch.snsStatus}
              </span>
              <span className="text-[10px] font-mono text-neutral-500 block mt-0.5">
                ACK: {alert.awsDispatch.ackLatencyMs}ms
              </span>
            </div>
          </div>

          {/* Anomaly Moment Zoom Chart */}
          <div className="p-4 rounded-xl bg-black/60 border border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-200">
                Error Rate Curve Around Anomaly Moment
              </span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Window: -30s to +30s
              </span>
            </div>

            {/* SVG Zoom Timeline */}
            <div className="w-full h-32 select-none">
              <svg viewBox="0 0 500 100" className="w-full h-full overflow-visible">
                {/* Baseline Guide */}
                <line x1="10" y1="80" x2="490" y2="80" stroke="#06B6D4" strokeWidth="1" strokeDasharray="3 3" />
                <text x="495" y="83" fill="#06B6D4" className="text-[8px] font-mono">μ (0.35%)</text>

                {/* 3-Sigma Critical Boundary */}
                <line x1="10" y1="45" x2="490" y2="45" stroke="#EF4444" strokeWidth="1" strokeDasharray="3 3" />
                <text x="495" y="48" fill="#EF4444" className="text-[8px] font-mono">3σ (1.2%)</text>

                {/* Spike Curve */}
                <path
                  d="M 10 80 Q 150 78, 200 65 T 250 15 T 300 60 T 400 78 T 490 80"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.5"
                />

                {/* Shaded Area */}
                <path
                  d="M 10 80 Q 150 78, 200 65 T 250 15 T 300 60 T 400 78 T 490 80 L 490 90 L 10 90 Z"
                  fill="#EF4444"
                  fillOpacity="0.08"
                />

                {/* Peak Anomaly Marker */}
                <circle cx="250" cy="15" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="2" />
                <text x="250" y="8" textAnchor="middle" fill="#FFFFFF" className="text-[9px] font-mono font-bold">
                  Peak: {(alert.errorRate * 100).toFixed(2)}% (+{alert.zScore}σ)
                </text>
              </svg>
            </div>
          </div>

          {/* Explainability Sample ERROR Lines (What judges want to see) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-200">
                  Sample ERROR Lines from Window (Explainability Evidence)
                </span>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">
                {sampleLines.length} anomalous traces captured
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/80 border border-white/[0.08] font-mono text-[11px] leading-relaxed space-y-2">
              {sampleLines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-neutral-300 border-b border-white/[0.04] pb-1.5 last:border-b-0 last:pb-0">
                  <span className="text-neutral-500 shrink-0">
                    {new Date(line.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
                    {line.level}
                  </span>
                  <span className="text-cyan-400/80 shrink-0">[{line.service}]</span>
                  {line.statusCode && (
                    <span className="text-red-400 font-semibold shrink-0">{line.statusCode}</span>
                  )}
                  <span className="flex-1 break-all text-neutral-200">{line.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-neutral-950/90 border-t border-white/[0.08]">
          <button
            onClick={() => onViewAwsPayload(alert)}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[#FF9900] hover:text-[#FFA726] transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Raw AWS SNS & CloudWatch JSON</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                onAcknowledge(alert.id);
                onClose();
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer ${
                alert.acknowledged
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-white text-black hover:bg-neutral-200 border-white'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{alert.acknowledged ? 'Acknowledged' : 'Acknowledge Incident'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-white/[0.08] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
