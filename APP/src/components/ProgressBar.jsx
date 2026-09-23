/**
 * Thin gold linear progress bar with an optional trailing count, e.g.
 * used for the Hessen "6 / 10" visual and the mock-exam header.
 * Never invents its own numbers — total/value always come from real state.
 */
export default function ProgressBar({ value, total, thin = false, showCount = true, countLabel }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="bar-row">
      <div className={`bar${thin ? " thin" : ""}`}>
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {showCount && (
        <span className="bar-count">{countLabel ?? `${value} / ${total}`}</span>
      )}
    </div>
  );
}
