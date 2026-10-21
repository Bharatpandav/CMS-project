import { useMemo } from 'react';

function formatShortDate(date) {
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
    });
}

export function ComplaintsChart({ complaints = [] }) {
    const chart = useMemo(() => {
        const days = 30;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const buckets = [];

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            buckets.push({
                date: d,
                key: d.toISOString().slice(0, 10),
                count: 0
            });
        }

        complaints.forEach((c) => {
            if (!c.createdAt) return;
            const key = new Date(c.createdAt)
                .toISOString()
                .slice(0, 10);
            const bucket = buckets.find((b) => b.key === key);
            if (bucket) bucket.count += 1;
        });

        const maxCount = Math.max(1, ...buckets.map((b) => b.count));
        const width = 560;
        const height = 200;
        const padX = 36;
        const padY = 24;
        const innerW = width - padX * 2;
        const innerH = height - padY * 2;

        const pts = buckets.map((b, i) => {
            const x =
                padX + (i / (buckets.length - 1 || 1)) * innerW;
            const y =
                padY + innerH - (b.count / maxCount) * innerH;
            return { x, y, count: b.count, date: b.date };
        });

        const linePath = pts
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
            .join(' ');

        const labelIndices = [0, 9, 19, 29];

        return {
            pts,
            linePath,
            labels: labelIndices.map((i) => ({
                x: pts[i]?.x,
                text: buckets[i] ? formatShortDate(buckets[i].date) : ''
            })),
            maxCount,
            width,
            height,
            padY,
            innerH
        };
    }, [complaints]);

    return (
        <div className="chart-wrap">
            <svg
                viewBox={`0 0 ${chart.width} ${chart.height}`}
                className="chart-svg"
                role="img"
                aria-label="Complaint trend for the last 30 days"
            >
                {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const y = chart.padY + chart.innerH * (1 - t);
                    return (
                        <line
                            key={t}
                            x1="36"
                            x2="524"
                            y1={y}
                            y2={y}
                            className="chart-grid"
                        />
                    );
                })}
                <path
                    d={chart.linePath}
                    className="chart-line"
                    fill="none"
                />
                {chart.pts.map((p, i) => (
                    <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r="4"
                        className="chart-dot"
                    >
                        <title>
                            {formatShortDate(p.date)}: {p.count}{' '}
                            complaint{p.count === 1 ? '' : 's'}
                        </title>
                    </circle>
                ))}
                {chart.labels.map((l, i) => (
                    <text
                        key={i}
                        x={l.x}
                        y="196"
                        className="chart-axis-label"
                        textAnchor="middle"
                    >
                        {l.text}
                    </text>
                ))}
            </svg>
            <p className="chart-caption">
                Peak day volume: {chart.maxCount} complaint
                {chart.maxCount === 1 ? '' : 's'}
            </p>
        </div>
    );
}
