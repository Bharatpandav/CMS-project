export function Card({ title, description, children, className = '' }) {
    return (
        <article className={`ui-card ${className}`.trim()}>
            {title || description ? (
                <header className="ui-card__header">
                    {title ? (
                        <h2 className="ui-card__title">{title}</h2>
                    ) : null}
                    {description ? (
                        <p className="ui-card__description">{description}</p>
                    ) : null}
                </header>
            ) : null}
            {children}
        </article>
    );
}
