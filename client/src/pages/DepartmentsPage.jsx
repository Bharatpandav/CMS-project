import { useCategoriesData } from '../hooks/useComplaintsData.js';

export function DepartmentsPage() {
    const { departments, loading, error, reload } = useCategoriesData();

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Departments</h1>
                <p>
                    Derived from complaint category routing (no dedicated
                    departments API).
                </p>
            </header>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>
                        Retry
                    </button>
                </div>
            ) : null}

            <article className="panel">
                {loading ? (
                    <p className="panel__loading">Loading…</p>
                ) : (
                    <ul className="simple-list">
                        {departments.map((d) => (
                            <li key={d}>{d}</li>
                        ))}
                    </ul>
                )}
            </article>
        </div>
    );
}
