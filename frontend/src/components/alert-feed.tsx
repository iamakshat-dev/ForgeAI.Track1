'use client';

import React from 'react';
import { AnomalyAlert } from '../types/telemetry';
import { Check, ExternalLink, ShieldAlert, AlertTriangle, Info, Terminal } from 'lucide-react';

interface AlertFeedProps {
  alerts: AnomalyAlert[];
  onAcknowledge: (alertId: string) => void;
  onInspectAws: (alert: AnomalyAlert) => void;
  onTraceLogs: (alert: AnomalyAlert) => void;
}

export function AlertFeed({
  alerts,
  onAcknowledge,
  onInspectAws,
  onTraceLogs,
}: AlertFeedProps) {
  const getSeverityBadge = (severity: AnomalyAlert['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
            <ShieldAlert className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            <AlertTriangle className="w-3 h-3" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Info className="w-3 h-3" />
            INFO
          </span>
        );
    }
  };

  const formatRelativeTime = (iso: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col h-full justify-between">
      {/* Feed Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-white">Live Alert Feed</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
            {alerts.length} Generated
          </span>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          Target: AWS SNS & CloudWatch
        </span>
      </div>

      {/* Alert List Container */}
      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[340px] pr-1.5 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/[0.08] rounded-xl">
            <ShieldAlert className="w-6 h-6 text-neutral-600 mb-2" />
            <p className="text-xs text-neutral-400">No active anomalies detected</p>
            <span className="text-[11px] font-mono text-neutral-500 mt-0.5">
              Sliding error rates within nominal baseline envelope
            </span>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3.5 rounded-xl border transition-all duration-200 ${
                alert.acknowledged
                  ? 'bg-neutral-950/40 border-white/[0.04] opacity-60'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-red-950/[0.12] border-red-500/25 shadow-sm'
                  : 'bg-neutral-900/60 border-white/[0.08]'
              }`}
            >
              {/* Alert Card Header */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(alert.severity)}
                  <span className="text-[11px] font-mono text-neutral-400">
                    {formatRelativeTime(alert.timestamp)}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400">·</span>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {alert.sourceService}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onAcknowledge(alert.id)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-full border transition-all cursor-pointer ${
                      alert.acknowledged
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-white/[0.04] text-neutral-400 hover:text-white border-white/[0.08] hover:border-white/[0.2]'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" />
                    {alert.acknowledged ? 'ACKED' : 'ACK'}
                  </button>
                </div>
              </div>

              {/* Anomaly Diagnosis Summary */}
              <p className="text-xs font-medium text-neutral-200 leading-snug mb-2.5">
                {alert.reason}
              </p>

              {/* Metric Breakdown Chips */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-black/40 border border-white/[0.04] mb-2.5 text-[11px] font-mono">
                <div>
                  <span className="block text-[9px] text-neutral-400 uppercase">Spike Rate</span>
                  <span className="font-semibold text-red-400">
                    {(alert.errorRate * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-neutral-400 uppercase">Baseline (μ)</span>
                  <span className="text-neutral-300">
                    {(alert.baselineRate * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] text-neutral-400 uppercase">Z-Deviation</span>
                  <span className="font-semibold text-amber-400">+{alert.zScore}σ</span>
                </div>
              </div>

              {/* AWS Dispatch Status Banner */}
              <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px] font-mono text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[#FF9900]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                    AWS SNS: {alert.awsDispatch.snsStatus}
                  </span>
                  <span>·</span>
                  <span className="text-neutral-400">CW Logs ({alert.awsDispatch.ackLatencyMs}ms)</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onTraceLogs(alert)}
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    title="Highlight matching logs in stream terminal"
                  >
                    <Terminal className="w-3 h-3" />
                    Trace
                  </button>
                  <button
                    onClick={() => onInspectAws(alert)}
                    className="inline-flex items-center gap-1 text-neutral-400 hover:text-[#FF9900] transition-colors cursor-pointer"
                    title="Inspect AWS CloudWatch & SNS JSON payload"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Payload
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
