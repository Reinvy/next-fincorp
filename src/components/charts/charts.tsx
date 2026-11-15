import { formatNumberID } from "@/lib/money";

function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${formatNumberID(value / 1_000_000_000, 1)} M`;
  if (abs >= 1_000_000) return `${formatNumberID(value / 1_000_000, 0)} jt`;
  if (abs >= 1_000) return `${formatNumberID(value / 1_000, 0)} rb`;
  return formatNumberID(value, 0);
}

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

export function BarChart({
  labels,
  series,
  height = 200,
  startAtZero = true,
}: {
  labels: string[];
  series: BarSeries[];
  height?: number;
  startAtZero?: boolean;
}) {
  const width = 640;
  const padding = { top: 14, right: 8, bottom: 26, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = series.flatMap((entry) => entry.values);
  const maxValue = Math.max(...values, 1);
  const minValue = startAtZero ? 0 : Math.min(...values, 0);
  const span = maxValue - minValue || 1;
  const baselineY = padding.top + ((maxValue - 0) / span) * plotHeight;
  const tickCount = 4;
  const groupWidth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(18, Math.max(4, (groupWidth - 14) / Math.max(series.length, 1)));
  const summary = series.map((entry) => `${entry.name}: ${entry.values.map(compact).join(", ")}`).join("; ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Grafik batang. ${summary}`}
        className="h-auto w-full"
      >
        <title>Grafik batang</title>
        {Array.from({ length: tickCount + 1 }, (_, index) => {
          const value = minValue + (span / tickCount) * index;
          const y = padding.top + plotHeight - (index / tickCount) * plotHeight;
          return (
            <g key={index}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--color-rule)" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-ink-faint)" fontFamily="var(--font-mono)">
                {compact(value)}
              </text>
            </g>
          );
        })}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={baselineY}
          y2={baselineY}
          stroke="var(--color-rule-strong)"
          strokeWidth={1}
        />
        {labels.map((label, labelIndex) => {
          const groupCenter = padding.left + groupWidth * labelIndex + groupWidth / 2;
          return (
            <g key={label}>
              {series.map((entry, seriesIndex) => {
                const value = entry.values[labelIndex] ?? 0;
                const barHeight = (Math.abs(value) / span) * plotHeight;
                const x =
                  groupCenter - (barWidth * series.length) / 2 + seriesIndex * barWidth + (seriesIndex > 0 ? 1 : 0);
                const y = value >= 0 ? baselineY - barHeight : baselineY;
                return (
                  <rect
                    key={entry.name}
                    x={x}
                    y={y}
                    width={Math.max(barWidth - 1, 1)}
                    height={Math.max(barHeight, value === 0 ? 0 : 1)}
                    fill={entry.color}
                    opacity={0.92}
                  >
                    <title>{`${label} · ${entry.name}: ${compact(value)}`}</title>
                  </rect>
                );
              })}
              <text
                x={groupCenter}
                y={height - 8}
                textAnchor="middle"
                fontSize={9}
                fill="var(--color-ink-faint)"
                fontFamily="var(--font-mono)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4">
        {series.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
            <span aria-hidden="true" className="h-2 w-2" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface LinePoint {
  label: string;
  value: number;
}

export function LineChart({
  points,
  height = 180,
  color = "var(--color-forest)",
  title,
}: {
  points: LinePoint[];
  height?: number;
  color?: string;
  title: string;
}) {
  const width = 640;
  const padding = { top: 14, right: 12, bottom: 26, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const span = maxValue - minValue || 1;
  const step = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const coords = points.map((point, index) => ({
    x: padding.left + step * index,
    y: padding.top + plotHeight - ((point.value - minValue) / span) * plotHeight,
    ...point,
  }));
  const path = coords.map((coordinate) => `${coordinate.x.toFixed(1)},${coordinate.y.toFixed(1)}`).join(" ");

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="h-auto w-full">
        <title>{title}</title>
        {Array.from({ length: 5 }, (_, index) => {
          const value = minValue + (span / 4) * index;
          const y = padding.top + plotHeight - (index / 4) * plotHeight;
          return (
            <g key={index}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--color-rule)" strokeWidth={1} />
              <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="var(--color-ink-faint)" fontFamily="var(--font-mono)">
                {compact(value)}
              </text>
            </g>
          );
        })}
        {coords.length > 0 ? (
          <>
            <polyline fill="none" stroke={color} strokeWidth={2} points={path} strokeLinejoin="round" strokeLinecap="round" />
            {coords.map((coordinate) => (
              <g key={coordinate.label}>
                <circle cx={coordinate.x} cy={coordinate.y} r={2.6} fill={color}>
                  <title>{`${coordinate.label}: ${compact(coordinate.value)}`}</title>
                </circle>
                <text
                  x={coordinate.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--color-ink-faint)"
                  fontFamily="var(--font-mono)"
                >
                  {coordinate.label}
                </text>
              </g>
            ))}
          </>
        ) : null}
      </svg>
    </div>
  );
}
