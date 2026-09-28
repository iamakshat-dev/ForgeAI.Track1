'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AnomalyAlert,
  LogEntry,
  StreamMetrics,
  TelemetryDataPoint,
} from '../types/telemetry';
import {
  generateInitialAlerts,
  generateInitialLogs,
  generateInitialTelemetryHistory,
  INITIAL_BASELINE_MEAN,
  INITIAL_BASELINE_STD_DEV,
  SLIDING_WINDOW_SEC,
} from '../lib/telemetry-engine';

export function useTelemetryStream() {
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetryDataPoint[]>([]);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [isSimulatingSpike, setIsSimulatingSpike] = useState(false);
  const [selectedWindow, setSelectedWindow] = useState('5m');
  const [connectionState, setConnectionState] = useState<'WEBSOCKET' | 'POLLING'>('WEBSOCKET');
  const [latencyMs, setLatencyMs] = useState(24);

  // Initialize data on mount
  useEffect(() => {
    setTelemetryHistory(generateInitialTelemetryHistory(28));
    setAlerts(generateInitialAlerts());
    setLogs(generateInitialLogs(25));
  }, []);

  // Real-time streaming interval
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Fluctuate latency slightly
      setLatencyMs(Math.floor(20 + Math.random() * 12));

      // Calculate next point
      setTelemetryHistory((prev) => {
        const last = prev[prev.length - 1];
        let errorRate = INITIAL_BASELINE_MEAN + (Math.random() - 0.5) * 0.0006;
        let isSpike = false;
        let spikeReason: string | undefined = undefined;

        if (isSimulatingSpike) {
          // Injected spike
          errorRate = 0.0482 + (Math.random() - 0.5) * 0.004;
          isSpike = true;
          spikeReason = 'Injected cluster: HTTP 502 Bad Gateway cascade across edge-nodes';
        }

        const zScore = Number(
          ((errorRate - INITIAL_BASELINE_MEAN) / INITIAL_BASELINE_STD_DEV).toFixed(2)
        );

        const newPoint: TelemetryDataPoint = {
          timestamp: now.toISOString(),
          timeLabel,
          errorRate: Math.max(0.0005, errorRate),
          totalLogs: Math.floor(140 + Math.random() * 30),
          errorCount: Math.round(errorRate * 150),
          baselineMean: INITIAL_BASELINE_MEAN,
          baselineUpperBand: INITIAL_BASELINE_MEAN + 2 * INITIAL_BASELINE_STD_DEV,
          baselineCriticalBand: INITIAL_BASELINE_MEAN + 3 * INITIAL_BASELINE_STD_DEV,
          isSpike,
          zScore,
          spikeReason,
        };

        const updated = [...prev.slice(1), newPoint];
        return updated;
      });

      // Generate streaming log
      const isErrorLog = isSimulatingSpike || Math.random() < 0.02;
      const newLogId = `log-${Date.now()}`;

      const newLog: LogEntry = {
        id: newLogId,
        timestamp: now.toISOString(),
        level: isErrorLog
          ? isSimulatingSpike
            ? 'ERROR'
            : 'WARN'
          : 'INFO',
        service: isSimulatingSpike ? 'auth-service.us-east-1' : 'api-gateway.edge',
        statusCode: isSimulatingSpike ? 502 : 200,
        message: isSimulatingSpike
          ? 'Upstream 502 Bad Gateway: Connection reset by peer in auth-service container'
          : `HTTP GET /api/v1/telemetry/heartbeat 200 OK - ${Math.floor(18 + Math.random() * 30)}ms`,
        isAnomaly: isSimulatingSpike,
      };

      setLogs((prev) => [...prev.slice(-40), newLog]);
    }, 2400);

    return () => clearInterval(interval);
  }, [isStreaming, isSimulatingSpike]);

  // Handle Injecting an Error Spike
  const triggerSpike = useCallback(() => {
    setIsSimulatingSpike(true);

    const now = new Date();
    const spikeRate = 0.0485;
    const zScore = 5.6;

    // Immediately push alert
    const newAlert: AnomalyAlert = {
      id: `alt-${Date.now()}`,
      timestamp: now.toISOString(),
      severity: 'CRITICAL',
      errorRate: spikeRate,
      baselineRate: INITIAL_BASELINE_MEAN,
      zScore,
      windowSeconds: SLIDING_WINDOW_SEC,
      reason: 'Sliding window error rate spiked to 4.85% (+5.6σ above baseline)',
      sourceService: 'auth-service.us-east-1',
      acknowledged: false,
      awsDispatch: {
        snsTopicArn: 'arn:aws:sns:us-east-1:182903847291:sre-incident-critical',
        snsMessageId: `msg-${Math.random().toString(36).substring(2, 9)}`,
        snsStatus: 'DELIVERED',
        cloudWatchLogGroup: '/aws/ecs/production/anomalies',
        cloudWatchLogStream: '2026/09/28/cluster-alpha',
        cloudWatchEventId: `cw-evt-${Date.now().toString(36)}`,
        cloudWatchStatus: 'INGESTED',
        dispatchedAt: now.toISOString(),
        ackLatencyMs: 42,
      },
    };

    setAlerts((prev) => [newAlert, ...prev]);

    // Automatically recover after 12 seconds to show baseline drift return
    setTimeout(() => {
      setIsSimulatingSpike(false);
    }, 12000);
  }, []);

  // Handle Resetting to baseline
  const resetNominal = useCallback(() => {
    setIsSimulatingSpike(false);
    setTelemetryHistory((prev) =>
      prev.map((pt) => ({
        ...pt,
        errorRate: INITIAL_BASELINE_MEAN + (Math.random() - 0.5) * 0.0004,
        isSpike: false,
        zScore: 0.15,
        spikeReason: undefined,
      }))
    );
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alt) => (alt.id === id ? { ...alt, acknowledged: true } : alt))
    );
  }, []);

  // Derive latest metrics
  const latestPoint = telemetryHistory[telemetryHistory.length - 1] || {
    errorRate: INITIAL_BASELINE_MEAN,
    zScore: 0.2,
  };

  const currentErrorRate = latestPoint.errorRate;
  const currentZScore = latestPoint.zScore;
  const activeAnomaliesCount = alerts.filter((a) => !a.acknowledged).length;
  const reliabilityScore = Math.max(90, Number((100 - currentErrorRate * 200).toFixed(2)));

  const sparklineHistory = telemetryHistory.map((p) => p.errorRate);

  return {
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
    connectionState,
    latencyMs,
    currentErrorRate,
    currentZScore,
    activeAnomaliesCount,
    reliabilityScore,
    sparklineHistory,
  };
}
