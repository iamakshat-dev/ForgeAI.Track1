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
            Dynamic parameter tuning applied immediately to the rolling sliding-window baseline engine
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Sliding Window & Baseline Parameters */}
        <div className="p-6 rounded-[24px] bg-neutral-950/80 border border-white/[0.08] space-y-6">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-semibold text-white">Sliding Window & Statistical Baseline</h3>
            <span className="text-xs text-neutral-400">
              Demonstrates learned dynamic baselines vs static hardcoded thresholds
            </span>
          </div>

          {/* Window Seconds */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-300">Sliding Window Duration</span>
              <span className="text-white font-bold">{config.windowSeconds} seconds</span>
            </div>
            <div className="flex gap-2">
              {[30, 60, 120, 300].map((sec) => (
                <button
                  key={sec}
                  onClick={() => setConfig({ ...config, windowSeconds: sec })}
                  className={`flex-1 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                    config.windowSeconds === sec
                      ? 'bg-white text-black font-semibold border-white shadow-sm'
                      : 'bg-black/50 text-neutral-400 border-white/[0.08] hover:text-white'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Critical Z-Score Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-300">Critical Anomaly Threshold (Z-Score)</span>
              <span className="text-red-400 font-bold">≥ {config.zScoreCritical}σ</span>
            </div>
            <input
              type="range"
              min="2.0"
              max="5.0"
              step="0.1"
              value={config.zScoreCritical}
              onChange={(e) => setConfig({ ...config, zScoreCritical: parseFloat(e.target.value) })}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-neutral-500">
              <span>2.0σ (Sensitive)</span>
              <span>3.0σ (Standard)</span>
              <span>5.0σ (Strict)</span>
            </div>
          </div>

          {/* Warning Z-Score Threshold */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-300">Warning Anomaly Threshold (Z-Score)</span>
              <span className="text-amber-400 font-bold">≥ {config.zScoreWarning}σ</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="3.0"
              step="0.1"
              value={config.zScoreWarning}
              onChange={(e) => setConfig({ ...config, zScoreWarning: parseFloat(e.target.value) })}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {/* Warmup Samples */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-neutral-300">Baseline Warm-Up Window</span>
              <span className="text-neutral-200 font-bold">{config.warmupSamples} samples</span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Number of historical sliding intervals required to calibrate the baseline mean (μ) and standard deviation (σ).
            </p>
          </div>
        </div>

        {/* Panel 2: Alert Sinks & AWS Destinations */}
        <div className="p-6 rounded-[24px] bg-neutral-950/80 border border-white/[0.08] space-y-6">
          <div className="border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-semibold text-white">Alert Dispatch Sinks</h3>
            <span className="text-xs text-neutral-400">
              Configure destinations for real-time anomaly alerts
            </span>
          </div>

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

          {/* Target ARN config */}
          <div className="space-y-3 pt-2 font-mono text-xs">
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
