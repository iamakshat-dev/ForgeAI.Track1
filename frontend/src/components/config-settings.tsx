'use client';

import React, { useState } from 'react';
import { DetectorConfig } from '../types/config';
import { Sliders, Save, Check, RefreshCw, Radio, Cloud, Bell, ShieldCheck } from 'lucide-react';

interface ConfigSettingsProps {
  initialConfig?: DetectorConfig;
  onSaveConfig: (newConfig: DetectorConfig) => void;
}

export function ConfigSettings({
  initialConfig = {
    windowSeconds: 60,
    zScoreCritical: 3.0,
    zScoreWarning: 2.0,
    zScoreInfo: 1.0,
    warmupSamples: 100,
    baselineMode: 'DYNAMIC_EMA',
    sinks: {
      awsSnsEnabled: true,
      awsCloudWatchEnabled: true,
      slackWebhookEnabled: false,
    },
    awsConfig: {
      snsTopicArn: 'arn:aws:sns:us-east-1:182903847291:sre-incident-critical',
      cloudWatchLogGroup: '/aws/ecs/production/anomalies',
      region: 'us-east-1',
    },
  },
  onSaveConfig,
}: ConfigSettingsProps) {
  const [config, setConfig] = useState<DetectorConfig>(initialConfig);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    onSaveConfig(config);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-[24px] bg-neutral-950/80 border border-white/[0.08] backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-white" />
            <h2 className="text-xl font-semibold text-white tracking-tight">Detection Engine Configuration</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Configure live incident notification destinations and AWS telemetry dispatch sinks
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-full bg-white text-black hover:bg-neutral-200 transition-all cursor-pointer shadow-md"
        >
          {savedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Applied to Engine (PUT /config)</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Save & Apply Immediately</span>
            </>
          )}
        </button>
      </div>

      {/* Alert Dispatch Sinks Panel */}
      <div className="p-6 rounded-[24px] bg-neutral-950/80 border border-white/[0.08] space-y-6">
        <div className="border-b border-white/[0.06] pb-3">
          <h3 className="text-sm font-semibold text-white">Alert Dispatch Sinks</h3>
          <span className="text-xs text-neutral-400">
            Configure destinations for real-time anomaly alerts and AWS audit trails
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sinks Toggles */}
          <div className="space-y-4">
            {/* AWS SNS Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/50 border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF9900]/15 flex items-center justify-center text-[#FF9900]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">AWS SNS Topic Push</span>
                  <span className="text-[10px] font-mono text-neutral-400">Immediate incident broadcast</span>
                </div>
              </div>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    sinks: { ...config.sinks, awsSnsEnabled: !config.sinks.awsSnsEnabled },
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  config.sinks.awsSnsEnabled ? 'bg-[#FF9900]' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.sinks.awsSnsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AWS CloudWatch Logs Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-black/50 border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block">AWS CloudWatch Logs</span>
                  <span className="text-[10px] font-mono text-neutral-400">Audit trail log group ingestion</span>
                </div>
              </div>
              <button
                onClick={() =>
                  setConfig({
                    ...config,
                    sinks: { ...config.sinks, awsCloudWatchEnabled: !config.sinks.awsCloudWatchEnabled },
                  })
                }
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  config.sinks.awsCloudWatchEnabled ? 'bg-cyan-500' : 'bg-neutral-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    config.sinks.awsCloudWatchEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Target ARN config */}
          <div className="space-y-4 font-mono text-xs">
            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">Target SNS Topic ARN</span>
              <input
                type="text"
                value={config.awsConfig.snsTopicArn}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    awsConfig: { ...config.awsConfig, snsTopicArn: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-black/70 border border-white/[0.08] rounded-xl text-neutral-300 focus:outline-none focus:border-white/[0.2]"
              />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 block mb-1">Target CloudWatch Log Group</span>
              <input
                type="text"
                value={config.awsConfig.cloudWatchLogGroup}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    awsConfig: { ...config.awsConfig, cloudWatchLogGroup: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-xs bg-black/70 border border-white/[0.08] rounded-xl text-neutral-300 focus:outline-none focus:border-white/[0.2]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
