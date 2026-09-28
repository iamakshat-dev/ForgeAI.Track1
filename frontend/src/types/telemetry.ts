export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  statusCode?: number;
  message: string;
  metadata?: Record<string, unknown>;
  isAnomaly?: boolean;
}

export type SeverityLevel = 'CRITICAL' | 'MAJOR' | 'WARNING' | 'INFO';

export interface AnomalyAlert {
  id: string;
  timestamp: string;
  severity: SeverityLevel;
  errorRate: number; // e.g. 0.0482 (4.82%)
  baselineRate: number; // e.g. 0.0035 (0.35%)
  zScore: number; // e.g. 4.2
  windowSeconds: number; // e.g. 60
  reason: string;
  sourceService: string;
  acknowledged: boolean;
  awsDispatch: {
    snsTopicArn: string;
    snsMessageId: string;
    snsStatus: 'DELIVERED' | 'QUEUED' | 'PENDING';
    cloudWatchLogGroup: string;
    cloudWatchLogStream: string;
    cloudWatchEventId: string;
    cloudWatchStatus: 'INGESTED' | 'PENDING';
    dispatchedAt: string;
    ackLatencyMs: number;
  };
}

export interface TelemetryDataPoint {
  timestamp: string;
  timeLabel: string;
  errorRate: number;
  totalLogs: number;
  errorCount: number;
  baselineMean: number;
  baselineUpperBand: number; // mean + 2 sigma
  baselineCriticalBand: number; // mean + 3 sigma
  isSpike: boolean;
  zScore: number;
  spikeReason?: string;
}

export interface StreamMetrics {
  currentErrorRate: number;
  baselineMean: number;
  baselineStdDev: number;
  currentZScore: number;
  throughputLps: number;
  totalLogsScanned: number;
  activeAnomaliesCount: number;
  reliabilityScore: number; // 0 to 100
  slidingWindowSeconds: number;
  connectionState: 'WEBSOCKET' | 'POLLING' | 'CONNECTING' | 'DISCONNECTED';
  awsDeliveryRate: number; // percentage, e.g. 100
}
