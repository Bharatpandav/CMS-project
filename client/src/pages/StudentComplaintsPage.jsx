import { Link } from 'react-router-dom';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';

export function StudentComplaintsPage({ title = 'My Complaints' }) {
    const { complaints, loading, error, reload } = useComplaintsData({
        limit: 50,
        myComplaints: 'true'
    });

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>{title}</h1>
                <p>Complaints you have raised or joined.</p>
            </header>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>Retry</button>
                </div>
            ) : null}

            <article className="panel panel--table">
                {loading ? (
                    <p className="panel__loading">Loading…</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={complaints}
                        showViewAll={false}
                    />
                )}
            </article>
            <p className="hint">
                To file a new complaint, use the official filing flow when
                available from your portal.{' '}
                <Link to="/student/support" className="link-teal">
                    Support
                </Link>
            </p>
        </div>
    );
}
