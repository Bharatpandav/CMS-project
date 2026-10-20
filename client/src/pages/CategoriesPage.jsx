import { useCategoriesData } from '../hooks/useComplaintsData.js';

export function CategoriesPage() {
    const { categories, loading, error, reload } = useCategoriesData();

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Complaint Categories</h1>
                <p>Active categories from the server.</p>
            </header>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>
                        Retry
                    </button>
                </div>
            ) : null}

            <article className="panel panel--table">
                {loading ? (
                    <p className="panel__loading">Loading…</p>
                ) : (
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Initial level</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat) => (
                                    <tr key={cat._id || cat.name}>
                                        <td>{cat.name}</td>
                                        <td>{cat.targetDepartment}</td>
                                        <td>{cat.initialLevel}</td>
                                        <td>{cat.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </article>
        </div>
    );
}
