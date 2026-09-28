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
  SERVICES,
  NORMAL_MESSAGES,
  ANOMALY_MESSAGES,
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
  const [streamTick, setStreamTick] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const isWsConnectedRef = useRef(false);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize baseline data on mount
  useEffect(() => {
    setTelemetryHistory(generateInitialTelemetryHistory(28));
    setAlerts(generateInitialAlerts());
    setLogs(generateInitialLogs(25));
  }, []);

  // Establish persistent WebSocket connection to FastAPI server
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isUnmounted = false;

    function initWebSocket() {
      if (isUnmounted) return;

      const host = window.location.hostname || 'localhost';
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${host}:8000/ws/stream`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isUnmounted) return;
          console.log('[Telemetry WS] Connected to:', wsUrl);
          isWsConnectedRef.current = true;
          setConnectionState('WEBSOCKET');
          setLatencyMs(Math.floor(14 + Math.random() * 8));
        };

        ws.onmessage = (event) => {
          if (isUnmounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'INITIAL_SNAPSHOT' && msg.data) {
              if (Array.isArray(msg.data.history) && msg.data.history.length > 0) {
                setTelemetryHistory(msg.data.history.slice(-28));
              }
              if (Array.isArray(msg.data.alerts) && msg.data.alerts.length > 0) {
                setAlerts(msg.data.alerts);
              }
              if (Array.isArray(msg.data.recentLogs) && msg.data.recentLogs.length > 0) {
                setLogs(msg.data.recentLogs);
              }
            } else if (msg.type === 'TELEMETRY_TICK' && msg.data) {
              setStreamTick((t) => t + 1);

              if (msg.data.currentPoint) {
                setTelemetryHistory((prev) => [...prev.slice(1), msg.data.currentPoint]);
              }
              if (Array.isArray(msg.data.alerts)) {
                setAlerts(msg.data.alerts);
              }
              if (Array.isArray(msg.data.recentLogs) && msg.data.recentLogs.length > 0) {
                setLogs(msg.data.recentLogs);
              }
              setLatencyMs(Math.floor(14 + Math.random() * 10));
            }
          } catch (err) {
            console.error('[Telemetry WS] JSON parse error:', err);
          }
        };

        ws.onerror = () => {
          isWsConnectedRef.current = false;
        };

        ws.onclose = () => {
          isWsConnectedRef.current = false;
          if (isUnmounted) return;
          setConnectionState('POLLING');
          reconnectTimerRef.current = setTimeout(() => {
            initWebSocket();
          }, 3000);
        };
      } catch (e) {
        isWsConnectedRef.current = false;
        setConnectionState('POLLING');
        reconnectTimerRef.current = setTimeout(() => {
          initWebSocket();
        }, 3000);
      }
    }

    initWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  // Streaming loop (handles HTTP polling / local simulation fallback when WS is inactive)
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(async () => {
      // If WebSocket is alive and receiving live pushes, skip HTTP polling
      if (isWsConnectedRef.current) {
        return;
      }

      const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
      const now = new Date();
      const timeLabel = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setStreamTick((t) => t + 1);

      // Attempt live fetch from Python FastAPI REST API
      try {
        const res = await fetch(`http://${host}:8000/api/v1/telemetry/current`, { signal: AbortSignal.timeout(800) });
        if (res.ok) {
          const data = await res.json();
          if (data.latestPoint) {
            setTelemetryHistory((prev) => [...prev.slice(1), data.latestPoint]);
          }
          const logsRes = await fetch(`http://${host}:8000/api/v1/logs?limit=45`, { signal: AbortSignal.timeout(800) });
          if (logsRes.ok) {
            const apiLogs = await logsRes.json();
            if (Array.isArray(apiLogs) && apiLogs.length > 0) {
              setLogs(apiLogs);
            }
          }
          const alertsRes = await fetch(`http://${host}:8000/api/v1/alerts`, { signal: AbortSignal.timeout(800) });
          if (alertsRes.ok) {
            const alertsData = await alertsRes.json();
            if (alertsData.alerts && Array.isArray(alertsData.alerts)) {
              setAlerts(alertsData.alerts);
            }
          }
          setLatencyMs(Math.floor(18 + Math.random() * 8));
          return;
        }
      } catch {
        // Fallback to local streaming generator if FastAPI server is temporarily unreachable
      }

      setLatencyMs(Math.floor(20 + Math.random() * 12));

      // Calculate next point locally
      setTelemetryHistory((prev) => {
        const wave = Math.sin(Date.now() / 4000) * 0.0012;
        let errorRate = Math.max(0.0012, INITIAL_BASELINE_MEAN + wave + (Math.random() - 0.5) * 0.0008);
        let isSpike = false;
        let spikeReason: string | undefined = undefined;

        if (isSimulatingSpike) {
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

        return [...prev.slice(1), newPoint];
      });

      // Generate streaming log
      const isErrorLog = isSimulatingSpike || Math.random() < 0.04;
      const newLogId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
      const randomService = SERVICES[Math.floor(Math.random() * SERVICES.length)];
      const normalItem = NORMAL_MESSAGES[Math.floor(Math.random() * NORMAL_MESSAGES.length)];
      const anomalyItem = ANOMALY_MESSAGES[Math.floor(Math.random() * ANOMALY_MESSAGES.length)];

      const newLog: LogEntry = {
        id: newLogId,
        timestamp: now.toISOString(),
        level: isErrorLog
          ? isSimulatingSpike
            ? 'ERROR'
            : (normalItem.level as any) || 'WARN'
          : 'INFO',
        service: isSimulatingSpike ? 'auth-service.us-east-1' : randomService,
        statusCode: isSimulatingSpike ? 502 : 200,
        message: isSimulatingSpike ? anomalyItem.msg : normalItem.msg,
        isAnomaly: isSimulatingSpike,
      };

      setLogs((prev) => [...prev.slice(-45), newLog]);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isSimulatingSpike]);

  // Handle Injecting an Error Spike (Bidirectional WebSocket + REST Fallback)
  const triggerSpike = useCallback(() => {
    setIsSimulatingSpike(true);
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'TRIGGER_SPIKE' }));
    }
    fetch(`http://${host}:8000/api/v1/simulate/spike`, { method: 'POST' }).catch(() => {});

    const now = new Date();
    const spikeRate = 0.0485;
    const zScore = 5.6;

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

    setTimeout(() => {
      setIsSimulatingSpike(false);
    }, 12000);
  }, []);

  // Handle Resetting to baseline (Bidirectional WebSocket + REST Fallback)
  const resetNominal = useCallback(() => {
    setIsSimulatingSpike(false);
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'RESET_NOMINAL' }));
    }
    fetch(`http://${host}:8000/api/v1/simulate/reset`, { method: 'POST' }).catch(() => {});

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

  // Acknowledge alert (Bidirectional WebSocket + REST Fallback)
  const acknowledgeAlert = useCallback((id: string) => {
    const host = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'ACKNOWLEDGE_ALERT', alertId: id }));
    }
    fetch(`http://${host}:8000/api/v1/alerts/${id}/acknowledge`, { method: 'POST' }).catch(() => {});

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
    streamTick,
  };
}
