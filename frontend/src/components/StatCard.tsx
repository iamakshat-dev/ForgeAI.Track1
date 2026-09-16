interface StatCardProps {
  label: string;
  value: string;
  caption?: string;
  /** Use for a value that's a longer string (e.g. a dataset name) rather
   * than a short number/percent -- the default text-2xl is sized for the
   * latter and wraps awkwardly for longer text. */
  compact?: boolean;
  /** Optional -- when set, the whole card renders as a button instead of a
   * static div (e.g. the Threshold Simulator's "Transactions affected"
   * card expanding its drill-down list). Omitted everywhere else, so every
   * other StatCard usage is completely unchanged. */
  onClick?: () => void;
  /** Only meaningful alongside onClick -- exposes expanded/collapsed state
   * to assistive tech without changing the card's look. */
  expanded?: boolean;
}

/** Stat tile: label (sentence case) + value (semibold, tabular mono --
 * every value here is a number, an amount, or an id, and this app's type
 * system reserves mono specifically for that). One card treatment now,
 * not a light/dark split -- `.card` itself resolves through the active
 * theme and carries its own pop/glow hover. */
export function StatCard({ label, value, caption, compact = false, onClick, expanded }: StatCardProps) {
  const content = (
    <>
      <div className="text-sm text-text-secondary">{label}</div>
      <div
        className={`mt-1 font-mono font-semibold text-text-primary tabular-nums break-words ${compact ? 'text-base' : 'text-2xl'}`}
      >
        {value}
      </div>
      {caption && <div className="mt-1 text-xs text-text-muted">{caption}</div>}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={expanded}
        className="card w-full p-4 text-left focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        {content}
      </button>
    );
  }

  return <div className="card p-4">{content}</div>;
}
