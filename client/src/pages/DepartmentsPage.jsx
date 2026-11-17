import { useEffect } from 'react';
import { useCategoriesData } from '../hooks/useComplaintsData.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

export function DepartmentsPage() {
    const { user } = useAuth();
    const { departments, loading, error, reload } = useCategoriesData();

    useEffect(() => {
        document.title = 'Departments | SBSSU CMS';
    }, []);

    const homePath = user?.role === 'hod' ? '/hod/dashboard' : '/app/dashboard';

    return (
        <div className="page-stack">
            <PageHeader
                title="Departments"
                description="Derived from complaint category routing (no dedicated departments API)."
                breadcrumbs={[
                    { to: homePath, label: 'Dashboard' },
                    { label: 'Departments' }
                ]}
            />

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
