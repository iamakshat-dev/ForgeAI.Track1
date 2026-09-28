import { AnomalyAlert, LogEntry, SeverityLevel, StreamMetrics, TelemetryDataPoint } from '../types/telemetry';

export const INITIAL_BASELINE_MEAN = 0.0035; // 0.35% normal error rate
export const INITIAL_BASELINE_STD_DEV = 0.0008; // 0.08% standard deviation
export const SLIDING_WINDOW_SEC = 60;

const SERVICES = [
  'api-gateway.edge',
  'auth-service.us-east-1',
  'order-pipeline.worker',
  'payment-ledger.processor',
  'inventory-sync.daemon',
  'postgres.connection-pool',
];

const NORMAL_MESSAGES = [
  { level: 'INFO', msg: 'Handled HTTP POST /api/v1/checkout/session 200 OK - 42ms' },
  { level: 'INFO', msg: 'JWT token validated for merchant_id=m_918231, role=ADMIN' },
  { level: 'INFO', msg: 'Batch replicated 124 records to replica cluster node-03' },
  { level: 'INFO', msg: 'Cache hit key=rate_limit:ip_192.168.1.44 - 1.2ms' },
  { level: 'WARN', msg: 'Upstream microservice latency elevated (p95=280ms > 200ms threshold)' },
  { level: 'INFO', msg: 'Database connection pool active: 18/50 connections leased' },
  { level: 'INFO', msg: 'Log aggregation heartbeat sync completed with AWS CloudWatch' },
  { level: 'INFO', msg: 'Webhook dispatched to endpoint https://merchant.webhook.io/v2' },
];

const ANOMALY_MESSAGES = [
  { level: 'ERROR', code: 502, msg: 'Upstream host timed out after 5000ms: auth-service.us-east-1 disconnected' },
  { level: 'FATAL', code: 500, msg: 'PostgresPoolExhaustedException: timeout waiting for idle database connection (max=50)' },
  { level: 'ERROR', code: 504, msg: 'Gateway timeout: downstream order-pipeline buffer queue capacity at 99.8%' },
  { level: 'ERROR', code: 500, msg: 'Unhandled Promise rejection in payment-ledger: Failed to acquire distributed lock' },
  { level: 'FATAL', code: 503, msg: 'CircuitBreaker state changed to OPEN for payment-gateway integration' },
];

export function generateInitialTelemetryHistory(count = 24): TelemetryDataPoint[] {
  const points: TelemetryDataPoint[] = [];
  const now = Date.now();
  const stepMs = 3000; // 3 seconds per interval

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * stepMs);
    const timeLabel = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Normal baseline noise
    const noise = (Math.random() - 0.5) * 0.0006;
    let rate = Math.max(0.001, INITIAL_BASELINE_MEAN + noise);
    let isSpike = false;
    let spikeReason: string | undefined = undefined;

    // Introduce one realistic historical anomaly near the end
    if (i === 4) {
      rate = 0.0465; // 4.65% spike
      isSpike = true;
      spikeReason = 'HTTP 502 Bad Gateway burst (auth-service)';
    }

    const zScore = (rate - INITIAL_BASELINE_MEAN) / INITIAL_BASELINE_STD_DEV;

    points.push({
      timestamp: time.toISOString(),
      timeLabel,
      errorRate: rate,
      totalLogs: Math.floor(120 + Math.random() * 30),
      errorCount: Math.round(rate * 140),
      baselineMean: INITIAL_BASELINE_MEAN,
      baselineUpperBand: INITIAL_BASELINE_MEAN + 2 * INITIAL_BASELINE_STD_DEV,
      baselineCriticalBand: INITIAL_BASELINE_MEAN + 3 * INITIAL_BASELINE_STD_DEV,
      isSpike,
      zScore: Number(zScore.toFixed(2)),
      spikeReason,
    });
  }

  return points;
}

export function generateInitialAlerts(): AnomalyAlert[] {
  const timestamp = new Date(Date.now() - 12000).toISOString();
  return [
    {
      id: 'alt-8491-a',
      timestamp,
      severity: 'CRITICAL',
      errorRate: 0.0482,
      baselineRate: INITIAL_BASELINE_MEAN,
      zScore: 5.4,
      windowSeconds: SLIDING_WINDOW_SEC,
      reason: 'Sliding window error rate (4.82%) breached 3.0σ critical boundary',
      sourceService: 'api-gateway.edge',
      acknowledged: false,
      awsDispatch: {
        snsTopicArn: 'arn:aws:sns:us-east-1:182903847291:sre-incident-critical',
        snsMessageId: 'msg-9b2f8a-491e-841c',
        snsStatus: 'DELIVERED',
        cloudWatchLogGroup: '/aws/ecs/production/anomalies',
        cloudWatchLogStream: '2026/09/28/edge-node-04',
        cloudWatchEventId: 'cw-evt-7193-8401',
        cloudWatchStatus: 'INGESTED',
        dispatchedAt: timestamp,
        ackLatencyMs: 38,
      },
    },
    {
      id: 'alt-8488-b',
      timestamp: new Date(Date.now() - 65000).toISOString(),
      severity: 'WARNING',
      errorRate: 0.0195,
      baselineRate: INITIAL_BASELINE_MEAN,
      zScore: 2.3,
      windowSeconds: SLIDING_WINDOW_SEC,
      reason: 'Elevated warning deviation detected in postgres.connection-pool',
      sourceService: 'postgres.connection-pool',
      acknowledged: true,
      awsDispatch: {
        snsTopicArn: 'arn:aws:sns:us-east-1:182903847291:sre-incident-critical',
        snsMessageId: 'msg-82a17f-193c-772a',
        snsStatus: 'DELIVERED',
        cloudWatchLogGroup: '/aws/ecs/production/anomalies',
        cloudWatchLogStream: '2026/09/28/db-pool-01',
        cloudWatchEventId: 'cw-evt-6119-2041',
        cloudWatchStatus: 'INGESTED',
        dispatchedAt: new Date(Date.now() - 65000).toISOString(),
        ackLatencyMs: 44,
      },
    },
  ];
}

export function generateInitialLogs(count = 20): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const isError = i < 3; // make latest 3 an anomaly trace
    const service = SERVICES[Math.floor(Math.random() * SERVICES.length)];
    const time = new Date(now - i * 800).toISOString();

    if (isError) {
      const anom = ANOMALY_MESSAGES[i % ANOMALY_MESSAGES.length];
      logs.push({
        id: `log-${Date.now()}-${i}`,
        timestamp: time,
        level: anom.level as any,
        service: anom.level === 'FATAL' ? 'postgres.connection-pool' : 'api-gateway.edge',
        statusCode: anom.code,
        message: anom.msg,
        isAnomaly: true,
      });
    } else {
      const norm = NORMAL_MESSAGES[Math.floor(Math.random() * NORMAL_MESSAGES.length)];
      logs.push({
        id: `log-${Date.now()}-${i}`,
        timestamp: time,
        level: norm.level as any,
        service,
        statusCode: 200,
        message: norm.msg,
        isAnomaly: false,
      });
    }
  }

  return logs;
}
