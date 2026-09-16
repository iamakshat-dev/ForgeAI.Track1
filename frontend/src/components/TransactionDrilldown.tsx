import { simulateTransactions } from '../api/client';
import { useApiData } from '../api/hooks';
import { formatAmount } from '../utils/format';
import { Skeleton } from './ui/skeleton';

function formatProbability(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/** The Threshold Simulator's drill-down: the actual validation-set rows
 * behind the "Transactions affected" count, not just the number. Only
 * mounted while the user has explicitly expanded that card (see
 * ThresholdSimulator.tsx) -- fetches once on mount and again whenever
 * `threshold` changes while it stays open, but never on its own timer and
 * never as a side effect of the slider's own debounced fetch.
 */
export function TransactionDrilldown({ threshold }: { threshold: number }) {
  const state = useApiData(() => simulateTransactions({ threshold, limit: 50 }), [threshold]);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-text-muted uppercase">
          Validation set -- not live transactions
        </p>
        {state.status === 'success' && (
          <p className="text-xs text-text-muted">
            Showing top {state.data.returned_count.toLocaleString()} of {state.data.total_affected.toLocaleString()}{' '}
            by fraud probability
          </p>
        )}
      </div>

      {state.status === 'loading' && <Skeleton className="mt-3 h-48" />}

      {state.status === 'error' && (
        <div className="mt-3">
          <p className="text-sm text-accent-rose">Couldn't load the drill-down: {state.error.message}</p>
          <button
            onClick={state.refetch}
            className="pill-glow mt-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors duration-150 hover:bg-bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <div className="mt-3 max-h-96 overflow-y-auto overflow-x-auto">
          {state.data.transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-secondary">
              No validation-set transactions are flagged at this threshold.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-bg-surface text-xs text-text-muted uppercase">
                <tr>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Fraud probability</th>
                  <th className="pb-2 pr-4 font-medium">True label</th>
                  <th className="pb-2 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {state.data.transactions.map((txn) => (
                  <tr key={txn.transaction_id} className="border-t border-border">
                    <td className="py-2 pr-4 font-mono tabular-nums text-text-primary">{formatAmount(txn.amount)}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums text-text-primary">
                      {formatProbability(txn.fraud_probability)}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={txn.true_label === 'fraud' ? 'text-accent-rose' : 'text-text-secondary'}>
                        {txn.true_label}
                      </span>
                    </td>
                    <td className="py-2 text-text-secondary">{txn.decision}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
