export interface DetectorConfig {
  windowSeconds: number; // e.g. 60
  zScoreCritical: number; // e.g. 3.0
  zScoreWarning: number; // e.g. 2.0
  zScoreInfo: number; // e.g. 1.0
  warmupSamples: number; // e.g. 100
  baselineMode: 'DYNAMIC_EMA' | 'FIXED_AUDITED';
  sinks: {
    awsSnsEnabled: boolean;
    awsCloudWatchEnabled: boolean;
    slackWebhookEnabled: boolean;
  };
  awsConfig: {
    snsTopicArn: string;
    cloudWatchLogGroup: string;
    region: string;
  };
}

export interface SinkHealth {
  name: string;
  type: 'AWS_SNS' | 'AWS_CLOUDWATCH' | 'WEBHOOK';
  status: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  lastSuccess: string;
  successRate: number; // e.g. 99.8
  avgLatencyMs: number;
  totalPushed: number;
  lastError?: string;
  targetArnOrGroup: string;
}
