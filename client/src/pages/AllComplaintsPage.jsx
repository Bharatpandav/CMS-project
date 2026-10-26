import { useLocation, useOutletContext } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { useListUiRestore } from '../hooks/useListUiRestore.js';
import { getComplaintsListPathForManagement } from '../config/managementPortalNav.js';

export function AllComplaintsPage() {
    const location = useLocation();
    const listStateKey = location.pathname;
    const inManagement = location.pathname.startsWith('/management');
    const dashboardTo = inManagement
        ? '/management/dashboard'
        : '/app/dashboard';
    useListUiRestore(listStateKey);
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
                  String(c._id).toLowerCase().includes(q) ||
                  c.publicId?.toLowerCase().includes(q)
          )
        : complaints;

    return (
        <div className="page-stack">
            <PageHeader
                breadcrumbs={[
                    { to: dashboardTo, label: 'Dashboard' },
                    { label: 'All Complaints' }
                ]}
                title="All Complaints"
                description="Complaints visible to your role (VC scope: escalated to VC level)."
            />

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
                        listStateKey={listStateKey}
                        complaintDetailBase={
                            inManagement
                                ? getComplaintsListPathForManagement()
                                : undefined
                        }
                    />
                )}
            </article>
        </div>
    );
}
