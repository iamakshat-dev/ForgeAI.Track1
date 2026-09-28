'use client';

import React, { useState } from 'react';
import { AnomalyAlert } from '../types/telemetry';
import { X, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';

interface AwsPayloadModalProps {
  alert: AnomalyAlert | null;
  onClose: () => void;
}

export function AwsPayloadModal({ alert, onClose }: AwsPayloadModalProps) {
  const [activeTab, setActiveTab] = useState<'SNS' | 'CLOUDWATCH'>('SNS');
  const [copied, setCopied] = useState(false);

  if (!alert) return null;

  const snsPayload = {
    Type: 'Notification',
    MessageId: alert.awsDispatch.snsMessageId,
    TopicArn: alert.awsDispatch.snsTopicArn,
    Subject: `[${alert.severity}] Anomaly Detected: ${alert.sourceService} (+${alert.zScore}σ)`,
    Message: JSON.stringify(
      {
        alertId: alert.id,
        timestamp: alert.timestamp,
        severity: alert.severity,
        sourceService: alert.sourceService,
        slidingWindowSeconds: alert.windowSeconds,
        metrics: {
          observedErrorRate: Number((alert.errorRate * 100).toFixed(2)),
          baselineRate: Number((alert.baselineRate * 100).toFixed(2)),
          zScoreDeviation: alert.zScore,
          criticalBoundary: 3.0,
        },
        diagnosis: alert.reason,
        remediationRunbook: 'https://runbooks.internal/sre/sliding-window-anomalies',
      },
      null,
      2
    ),
    Timestamp: alert.awsDispatch.dispatchedAt,
    SignatureVersion: '1',
    DeliveryStatus: alert.awsDispatch.snsStatus,
  };

  const cloudWatchPayload = {
    logGroupName: alert.awsDispatch.cloudWatchLogGroup,
    logStreamName: alert.awsDispatch.cloudWatchLogStream,
    logEvents: [
      {
        timestamp: new Date(alert.timestamp).getTime(),
        eventId: alert.awsDispatch.cloudWatchEventId,
        message: JSON.stringify({
          eventType: 'ANOMALY_BREACH',
          service: alert.sourceService,
          severity: alert.severity,
          errorRate: alert.errorRate,
          baselineMean: alert.baselineRate,
          zScore: alert.zScore,
          windowSeconds: alert.windowSeconds,
          status: 'TRIGGERED',
        }),
      },
    ],
  };

  const activeJson =
    activeTab === 'SNS'
      ? JSON.stringify(snsPayload, null, 2)
      : JSON.stringify(cloudWatchPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-neutral-950 border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-neutral-900/60">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF9900]" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              AWS Outbound Dispatch Inspector
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FF9900]/10 text-[#FF9900] border border-[#FF9900]/20">
              HTTP 200 ACK
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-black/40 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('SNS')}
              className={`px-3 py-1 text-xs font-mono rounded-full border transition-all cursor-pointer ${
                activeTab === 'SNS'
                  ? 'bg-[#FF9900]/15 text-[#FF9900] border-[#FF9900]/30 font-semibold'
                  : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
              }`}
            >
              AWS SNS Notification
            </button>
            <button
              onClick={() => setActiveTab('CLOUDWATCH')}
              className={`px-3 py-1 text-xs font-mono rounded-full border transition-all cursor-pointer ${
                activeTab === 'CLOUDWATCH'
                  ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 font-semibold'
                  : 'bg-transparent text-neutral-400 border-transparent hover:text-white'
              }`}
            >
              AWS CloudWatch Logs Event
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300 border border-white/[0.08] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy JSON</span>
              </>
            )}
          </button>
        </div>

        {/* Code Content */}
        <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-neutral-200 bg-[#080B11] leading-relaxed custom-scrollbar">
          <pre className="whitespace-pre-wrap">{activeJson}</pre>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-neutral-950 border-t border-white/[0.08] text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Dispatched with AWS Signature V4</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs font-sans rounded-full bg-white text-black font-medium hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
