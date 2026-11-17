import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { useListUiRestore } from '../hooks/useListUiRestore.js';

export function StudentComplaintsPage({
    title = 'My Complaints',
    scope = 'mine'
}) {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const listStateKey = location.pathname + location.search;
    const isPublic = scope === 'public';
    const status = isPublic ? undefined : searchParams.get('status') || undefined;
    useListUiRestore(listStateKey);
    const { complaints, loading, error, reload } = useComplaintsData({
        limit: 50,
        myComplaints: isPublic ? undefined : true,
        raisedOnly: isPublic ? undefined : true,
        publicFeed: isPublic,
        status
    });

    return (
        <div className="page-stack">
            <PageHeader
                breadcrumbs={[
                    { to: '/student/dashboard', label: 'Dashboard' },
                    { label: title }
                ]}
                title={title}
                description={
                    isPublic
                        ? 'Latest public complaints across the university. Private complaints are not included.'
                        : 'Complaints you have raised or joined.'
                }
            />

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
                        complaintDetailBase="/student/complaints"
                        listStateKey={listStateKey}
                    />
                )}
            </article>
            <p className="hint">
                <Link
                    to="/student/complaints/register"
                    className="link-teal"
                >
                    Register a new complaint
                </Link>
            </p>
        </div>
    );
}
