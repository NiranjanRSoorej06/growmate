// A tiny height-over-time line. `points` is [{label, value}] in chronological order.
export default function Sparkline({ points }) {
  if (points.length < 2) return null;
  const w = 280;
  const h = 70;
  const pad = 8;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => [
    pad + (i / (points.length - 1)) * (w - pad * 2),
    h - pad - ((p.value - min) / span) * (h - pad * 2),
  ]);
  const summary = `Height grew from ${values[0]} cm to ${values[values.length - 1]} cm over ${points.length} measurements.`;
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xs" role="img" aria-label={summary}>
        <polyline
          points={coords.map((c) => c.join(",")).join(" ")}
          fill="none"
          stroke="#2F5D3A"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#BFE05A" stroke="#2F5D3A" strokeWidth="2" />
        ))}
      </svg>
      <figcaption className="text-sm text-ink/70">{summary}</figcaption>
    </figure>
  );
}
