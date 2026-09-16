import { useEffect, useState } from 'react';
import { simulate } from '../api/client';
import { useLiveApiData } from '../api/hooks';
import { ErrorBlock, LoadingBlock } from '../components/AsyncState';
import { PrecisionRecallCurveChart } from '../components/PrecisionRecallCurveChart';
import type { CurvePoint } from '../components/PrecisionRecallCurveChart';
import { StatCard } from '../components/StatCard';
import { TransactionDrilldown } from '../components/TransactionDrilldown';
import { Skeleton } from '../components/ui/skeleton';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { formatAmount } from '../utils/format';

// 150ms: the backend responds in single-digit milliseconds (see
// api/services/simulation_service.py's precomputed validation-set
// probabilities), so this isn't about backend load -- it's purely to
// avoid firing a request on every pixel of a fast slider drag, which
// would otherwise queue up dozens of in-flight requests per second.
const DEBOUNCE_MS = 150;

// The curve is fetched once on mount (not on every slider move): 51
// points at 0.02 steps across the full 0-1 range, each a normal
// /simulate call run in parallel. At a few ms server-side each, 51 in
// parallel is still well under a second total.
const CURVE_THRESHOLDS = Array.from({ length: 51 }, (_, i) => Math.round(i * 2) / 100);

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ThresholdSimulator() {
  const [threshold, setThreshold] = useState(0.5);
  const [retryNonce, setRetryNonce] = useState(0);
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const debouncedThreshold = useDebouncedValue(threshold, DEBOUNCE_MS);

  const live = useLiveApiData(() => simulate({ threshold: debouncedThreshold }), [debouncedThreshold, retryNonce]);

  const [curve, setCurve] = useState<CurvePoint[] | null>(null);
  const [curveError, setCurveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(CURVE_THRESHOLDS.map((t) => simulate({ threshold: t })))
      .then((results) => {
        if (cancelled) return;
        setCurve(results.map((r) => ({ threshold: r.threshold, precision: r.precision, recall: r.recall })));
      })
      .catch((error: unknown) => {
        if (!cancelled) setCurveError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (live.status === 'loading') return <LoadingBlock />;
  if (live.status === 'error') {
    return <ErrorBlock message={live.error.message} onRetry={() => setRetryNonce((n) => n + 1)} />;
  }

  const data = live.data;

  return (
    <div className="space-y-8">
      <div className="card p-6">
        <h1 className="font-display text-lg font-semibold text-text-primary">Threshold Simulator</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          Shows what would happen at any decision threshold, computed against the{' '}
          <strong className="text-text-primary">validation set's</strong> pre-scored predictions (Day 1/2's
          held-out validation split) -- <strong className="text-text-primary">not live traffic</strong>. Move the
          slider to see the tradeoff.
        </p>
        {live.isStale && (
          <p className="mt-2 text-xs text-accent-rose">
            The last update failed ({live.lastError?.message ?? 'unknown error'}) -- showing the previous reading.
            Move the slider again to retry.
          </p>
        )}
      </div>

      <div className="card p-4 text-sm text-text-secondary">
        <strong className="text-text-primary">The core tradeoff:</strong> a{' '}
        <strong className="text-text-primary">lower</strong> threshold catches more fraud but flags more
        legitimate transactions too (more customer friction / false positives). A{' '}
        <strong className="text-text-primary">higher</strong> threshold reduces that friction but misses more
        fraud. No threshold improves both at once -- the slider below trades one for the other.
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between">
          <label htmlFor="threshold-slider" className="text-sm font-medium text-text-primary">
            Risk threshold
          </label>
          <span className="font-mono text-2xl font-semibold tabular-nums text-text-primary">{threshold.toFixed(2)}</span>
        </div>
        <input
          id="threshold-slider"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          onChange={(event) => setThreshold(Number(event.target.value))}
          className="mt-3 w-full accent-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-4"
        />
        <div className="mt-1 flex justify-between text-xs text-text-muted">
          <span>0.00 -- flag everything</span>
          <span>1.00 -- flag almost nothing</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Precision" value={formatPercent(data.precision)} caption="of flagged, % actually fraud" />
        <StatCard label="Recall" value={formatPercent(data.recall)} caption="of actual fraud, % caught" />
        <StatCard label="False positive rate" value={formatPercent(data.false_positive_rate)} caption="of legitimate txns, % wrongly flagged" />
        <StatCard
          label="Fraud caught"
          value={`${data.fraud_caught_count} / ${data.fraud_caught_count + data.fn}`}
          caption={formatPercent(data.fraud_caught_percent / 100)}
        />
        <StatCard
          label="Transactions affected"
          value={data.transactions_affected_count.toLocaleString()}
          caption={`${data.transactions_affected_percent.toFixed(2)}% of validation set (REVIEW/HOLD) -- click to view`}
          onClick={() => setDrilldownOpen((open) => !open)}
          expanded={drilldownOpen}
        />
        <StatCard
          label="Expected financial loss"
          value={formatAmount(data.expected_financial_loss)}
          caption={`fp_cost=${data.false_positive_cost}, fn_cost=${data.false_negative_cost} (placeholder units)`}
        />
      </div>

      {drilldownOpen && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-text-primary">Affected transactions</h2>
            <button
              onClick={() => setDrilldownOpen(false)}
              className="text-xs font-medium text-text-muted hover:text-text-primary"
            >
              Collapse
            </button>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            The same validation-set rows behind the count above, at the current threshold ({debouncedThreshold.toFixed(2)}).
          </p>
          <TransactionDrilldown threshold={debouncedThreshold} />
        </div>
      )}

      <div className="card p-6">
        <h2 className="font-display text-base font-semibold text-text-primary">Precision / recall vs. threshold</h2>
        <p className="mt-1 text-xs text-text-muted">Dashed line marks the current slider position.</p>
        {curveError ? (
          <p className="mt-3 text-sm text-accent-rose">Couldn't load the curve: {curveError}</p>
        ) : curve ? (
          <PrecisionRecallCurveChart points={curve} currentThreshold={debouncedThreshold} />
        ) : (
          <Skeleton className="mt-3 h-70" />
        )}
      </div>
    </div>
  );
}
