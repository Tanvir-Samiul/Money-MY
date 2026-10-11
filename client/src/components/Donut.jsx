/**
 * SVG donut chart.
 * Slices render in order. Each begins where the previous ended.
 *
 * Uses pathLength={1} so strokeDasharray values are fractions of the circle,
 * not raw pixel lengths — this avoids the "pattern repeats" bug where later
 * slices cover earlier ones.
 */
export default function Donut({ slices, total, size = 180, stroke = 28 }) {
  // ----- Empty state -----
  if (!slices || slices.length === 0 || total <= 0) {
    return (
      <div
        className="flex items-center justify-center text-text-muted text-xs rounded-full"
        style={{
          width: size,
          height: size,
          border: `${stroke}px solid var(--border)`,
        }}
      >
        No data
      </div>
    );
  }

  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // ----- Normalize slices to { color, value } -----
  const normalized = slices
    .map((s) => ({
      color: s.color || "#888888",
      value: Number(s.value ?? s.total ?? 0),
    }))
    .filter((s) => s.value > 0);

  const sumValues = normalized.reduce((a, b) => a + b.value, 0);
  if (!Number.isFinite(sumValues) || sumValues <= 0) {
    return (
      <div
        className="flex items-center justify-center text-text-muted text-xs rounded-full"
        style={{
          width: size,
          height: size,
          border: `${stroke}px solid var(--border)`,
        }}
      >
        No data
      </div>
    );
  }

  let cumulative = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={stroke}
      />

      {/* Slices */}
      {normalized.map((s, i) => {
        const fraction = s.value / sumValues;
        const el = (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            pathLength={1}
            strokeDasharray={`${fraction} 1`}
            strokeDashoffset={-cumulative}
            strokeLinecap="butt"
          />
        );
        cumulative += fraction;
        return el;
      })}
    </svg>
  );
}
