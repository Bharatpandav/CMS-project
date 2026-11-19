import { EmptyState } from '../ui/index.js';

function buildDailyBuckets(complaints, dayCount) {
    const buckets = new Map();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = dayCount - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        buckets.set(d.toISOString().slice(0, 10), 0);
    }

    complaints.forEach((c) => {
        if (!c.createdAt) return;
        const key = new Date(c.createdAt).toISOString().slice(0, 10);
        if (buckets.has(key)) {
            buckets.set(key, buckets.get(key) + 1);
        }
    });

    return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

function formatAxisLabel(isoDate) {
    const d = new Date(isoDate);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ComplaintsOverviewChart({
    complaints = [],
    days = 30,
    loading,
    error
}) {
    if (loading) {
        return <div className="mgmt-chart-empty">Loading chart…</div>;
    }
    if (error) {
        return <div className="mgmt-chart-empty">{error}</div>;
    }

    const series = buildDailyBuckets(complaints, days);
    const max = Math.max(1, ...series.map((p) => p.count));
    const width = 640;
    const height = 200;
    const padX = 36;
    const padY = 24;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const points = series.map((p, i) => {
        const x = padX + (i / Math.max(1, series.length - 1)) * innerW;
        const y = padY + innerH - (p.count / max) * innerH;
        return { x, y, ...p };
    });

    const linePath = points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padX} ${padY + innerH} L ${points[0]?.x ?? padX} ${padY + innerH} Z`;

    const hasData = series.some((p) => p.count > 0);

    if (!hasData) {
        return (
            <EmptyState icon="activity" title="No complaints in this period">
                No complaint activity in your authorized scope for the selected
                range.
            </EmptyState>
        );
    }

    const yTicks = [0, Math.ceil(max / 2), max];

    return (
        <div className="mgmt-chart-wrap">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                width="100%"
                height="100%"
                role="img"
                aria-label="Complaints over time"
            >
                {yTicks.map((tick) => {
                    const y = padY + innerH - (tick / max) * innerH;
                    return (
                        <g key={tick}>
                            <line
                                x1={padX}
                                x2={width - padX}
                                y1={y}
                                y2={y}
                                stroke="#e2e8f0"
                                strokeWidth="1"
                            />
                            <text
                                x={padX - 6}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="10"
                                fill="#94a3b8"
                            >
                                {tick}
                            </text>
                        </g>
                    );
                })}
                <path d={areaPath} fill="rgba(59, 130, 246, 0.12)" />
                <path
                    d={linePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
                {points.map((p) => (
                    <circle
                        key={p.date}
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="#3b82f6"
                        stroke="#fff"
                        strokeWidth="1.5"
                    />
                ))}
                {points
                    .filter((_, i) => i % Math.ceil(series.length / 6) === 0)
                    .map((p) => (
                        <text
                            key={`lbl-${p.date}`}
                            x={p.x}
                            y={height - 4}
                            textAnchor="middle"
                            fontSize="9"
                            fill="#94a3b8"
                        >
                            {formatAxisLabel(p.date)}
                        </text>
                    ))}
            </svg>
        </div>
    );
}
