'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LogEntry, LogLevel } from '../types/telemetry';
import { Pause, Play, Terminal, ArrowDown, Search, ShieldAlert, Copy, Check } from 'lucide-react';

interface LiveLogStreamProps {
  logs: LogEntry[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  highlightedAlertId?: string | null;
}

export function LiveLogStream({
  logs,
  isStreaming,
  onToggleStreaming,
  highlightedAlertId,
}: LiveLogStreamProps) {
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll ONLY within the internal container, never scrolling the browser window!
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.service.toLowerCase().includes(q) ||
        (log.statusCode && log.statusCode.toString().includes(q))
      );
    }
    return true;
  });

  const handleCopyLine = (log: LogEntry) => {
    const text = `[${log.timestamp}] [${log.level}] [${log.service}] ${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'FATAL':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'ERROR':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'WARN':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className="flex flex-col h-full rounded-[24px] bg-[#0A0D14] border border-white/[0.08] overflow-hidden shadow-2xl">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-neutral-950/90 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="h-4 w-px bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-200 tracking-tight">
              Live Ingest Stream Console
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-neutral-400 border border-white/[0.08]">
            /var/log/application.log
          </span>
        </div>

        {/* Stream Actions & Filters */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stream..."
              className="w-32 sm:w-44 pl-7 pr-2.5 py-1 text-xs font-mono bg-black/60 border border-white/[0.08] rounded-full text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-white/[0.2]"
            />
          </div>

          {/* Level Filter Pills */}
          <div className="flex items-center p-0.5 rounded-full bg-black/70 border border-white/[0.08]">
            {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-0.5 text-[10px] font-mono rounded-full transition-colors cursor-pointer ${
                  filterLevel === lvl
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Auto Scroll Toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
              autoScroll
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : 'bg-white/[0.04] text-neutral-400 border-white/[0.08]'
            }`}
            title={autoScroll ? 'Auto-scroll active' : 'Auto-scroll paused'}
          >
            <ArrowDown className="w-3 h-3" />
          </button>

          {/* Pause / Play Streaming Toggle */}
          <button
            onClick={onToggleStreaming}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-full border transition-all cursor-pointer ${
              isStreaming
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3 h-3" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>RESUME</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Content Body with internal scroll only */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-4 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[300px] space-y-1 select-text custom-scrollbar"
      >
        {filteredLogs.length === 0 ? (
          <div className="py-8 text-center text-neutral-500">
            No matching log entries found for current filters
          </div>
        ) : (
          filteredLogs.map((log) => {
            const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                className={`group flex items-start gap-2.5 px-2.5 py-1 rounded transition-colors ${
                  log.isAnomaly
                    ? 'bg-red-950/30 border-l-2 border-red-500 text-red-200'
                    : 'hover:bg-white/[0.03] text-neutral-300'
                }`}
              >
                {/* Timestamp */}
                <span className="text-neutral-500 shrink-0 select-none">{time}</span>

                {/* Log Level Chip */}
                <span
                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold border shrink-0 ${getLevelColor(
                    log.level
                  )}`}
                >
                  {log.level}
                </span>

                {/* Service Tag */}
                <span className="text-cyan-400/80 shrink-0">[{log.service}]</span>

                {/* Status code if present */}
                {log.statusCode && (
                  <span
                    className={`font-semibold shrink-0 ${
                      log.statusCode >= 500
                        ? 'text-red-400'
                        : log.statusCode >= 400
                        ? 'text-amber-400'
                        : 'text-neutral-400'
                    }`}
                  >
                    {log.statusCode}
                  </span>
                )}

                {/* Log message */}
                <span className="flex-1 break-all">{log.message}</span>

                {/* Anomaly Indicator */}
                {log.isAnomaly && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    SPIKE
                  </span>
                )}

                {/* Copy button */}
                <button
                  onClick={() => handleCopyLine(log)}
                  className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-white transition-opacity p-0.5 cursor-pointer"
                  title="Copy log entry"
                >
                  {copiedId === log.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Telemetry */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-neutral-950/80 border-t border-white/[0.04] text-[10px] font-mono text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ingest Throughput: 1,420 lines/sec
          </span>
          <span>·</span>
          <span>Buffer: {logs.length} entries retained</span>
        </div>

        <div className="flex items-center gap-3">
          <span>Encoding: UTF-8</span>
          <span>·</span>
          <span>Lossless Stream</span>
        </div>
      </div>
    </div>
  );
}
