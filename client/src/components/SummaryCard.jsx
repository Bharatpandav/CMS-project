export function SummaryCard({ icon, label, value, hint, accent = 'teal' }) {
    return (
        <article className={`summary-card summary-card--${accent}`}>
            <div className="summary-card__icon" aria-hidden="true">
                {icon}
            </div>
            <div className="summary-card__body">
                <p className="summary-card__value">{value}</p>
                <p className="summary-card__label">{label}</p>
                {hint ? (
                    <p className="summary-card__hint">{hint}</p>
                ) : null}
            </div>
        </article>
    );
}
