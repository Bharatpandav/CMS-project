import { useOutletContext } from 'react-router-dom';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';

export function AllComplaintsPage() {
    const { search = '' } = useOutletContext() || {};
    const { complaints, loading, error, reload } = useComplaintsData({
        limit: 100
    });

    const q = search.trim().toLowerCase();
    const filtered = q
        ? complaints.filter(
              (c) =>
                  c.title?.toLowerCase().includes(q) ||
                  c.department?.toLowerCase().includes(q) ||
                  String(c._id).toLowerCase().includes(q)
          )
        : complaints;

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>All Complaints</h1>
                <p>
                    Complaints visible to your role (VC scope: escalated to VC
                    level).
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

            <article className="panel panel--table">
                {loading ? (
                    <p className="panel__loading">Loading…</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={filtered}
                        showViewAll={false}
                    />
                )}
            </article>
        </div>
    );
}
