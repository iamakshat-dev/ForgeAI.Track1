'use client';

import React, { useState } from 'react';
import { AnomalyAlert, SeverityLevel } from '../types/telemetry';
import { ShieldAlert, AlertTriangle, Info, Check, Search, Filter, ArrowUpRight, Cloud } from 'lucide-react';

interface AlertHistoryProps {
  alerts: AnomalyAlert[];
  onSelectAlert: (alert: AnomalyAlert) => void;
  onAcknowledge: (id: string) => void;
}

export function AlertHistory({ alerts, onSelectAlert, onAcknowledge }: AlertHistoryProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | 'ALL'>('ALL');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | 'ALL'>('24h');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAlerts = alerts.filter((alert) => {
    if (selectedSeverity !== 'ALL' && alert.severity !== selectedSeverity) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        alert.sourceService.toLowerCase().includes(q) ||
        alert.reason.toLowerCase().includes(q) ||
        alert.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="w-full space-y-5 animate-in fade-in duration-200">
      {/* View Header & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-[22px] bg-neutral-950/80 border border-white/[0.08] backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-semibold text-white tracking-tight">Alert History</h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
              {filteredAlerts.length} past incidents
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Historical sliding-window anomaly triggers with baseline telemetry and AWS dispatch audit
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents..."
              className="w-44 sm:w-56 pl-8 pr-3 py-1.5 text-xs font-mono bg-black/60 border border-white/[0.08] rounded-full text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-white/[0.2]"
            />
          </div>

          {/* Severity Pills */}
          <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-white/[0.08]">
            {(['ALL', 'CRITICAL', 'WARNING'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 text-xs font-mono rounded-full transition-all cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-white text-black font-semibold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center p-0.5 rounded-full bg-black/60 border border-white/[0.08]">
            {(['1h', '24h', '7d', 'ALL'] as const).map((rng) => (
              <button
                key={rng}
                onClick={() => setSelectedTimeRange(rng)}
                className={`px-2.5 py-1 text-xs font-mono rounded-full transition-all cursor-pointer ${
                  selectedTimeRange === rng
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {rng}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="rounded-[22px] bg-neutral-950/80 border border-white/[0.08] overflow-hidden backdrop-blur-md shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-black/40 text-neutral-400 text-[11px] uppercase tracking-wider">
                <th className="py-3 px-5 font-medium">Timestamp</th>
                <th className="py-3 px-4 font-medium">Severity</th>
                <th className="py-3 px-4 font-medium">Source Service</th>
                <th className="py-3 px-4 font-medium">Observed Rate</th>
                <th className="py-3 px-4 font-medium">Baseline (μ)</th>
                <th className="py-3 px-4 font-medium">Z-Score</th>
                <th className="py-3 px-4 font-medium">AWS Dispatch</th>
                <th className="py-3 px-5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-500 font-sans">
                    No alert history matching filter criteria
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr
                    key={alert.id}
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => onSelectAlert(alert)}
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-5 text-neutral-400">
                      {new Date(alert.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })}
                    </td>

                    {/* Severity Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-red-500/15 text-red-400 border-red-500/30'
                            : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {alert.severity === 'CRITICAL' ? (
                          <ShieldAlert className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {alert.severity}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4 text-cyan-400/90 font-medium">
                      {alert.sourceService}
                    </td>

                    {/* Observed Rate */}
                    <td className="py-3.5 px-4 font-bold text-red-400">
                      {(alert.errorRate * 100).toFixed(2)}%
                    </td>

                    {/* Baseline */}
                    <td className="py-3.5 px-4 text-neutral-400">
                      {(alert.baselineRate * 100).toFixed(2)}%
                    </td>

                    {/* Z-Score */}
                    <td className="py-3.5 px-4 font-bold text-amber-400">
                      +{alert.zScore}σ
                    </td>

                    {/* AWS Dispatch */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-[#FF9900] bg-[#FF9900]/10 px-2 py-0.5 rounded border border-[#FF9900]/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FF9900]" />
                        SNS: {alert.awsDispatch.snsStatus}
                      </span>
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelectAlert(alert)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 border border-white/[0.08] transition-all cursor-pointer"
                      >
                        <span>Details</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
