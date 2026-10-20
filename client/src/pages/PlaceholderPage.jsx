export function PlaceholderPage({ title, description }) {
    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>{title}</h1>
                <p>{description}</p>
            </header>
            <article className="panel placeholder-panel">
                <p>
                    This section is not fully available until the backend
                    exposes the required API.
                </p>
            </article>
        </div>
    );
}
