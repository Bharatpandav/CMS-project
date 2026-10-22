import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { complaintsApi } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge.jsx';
import { resolveComplaintsListPath } from '../utils/navigationPaths.js';

export function ComplaintDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const complaintsListPath = resolveComplaintsListPath(
        user?.role,
        location.pathname
    );
    const isStudent = user?.role === 'student';
    const listLabel = isStudent ? 'My Complaints' : 'Complaints';
    const dashboardTo = location.pathname.startsWith('/management')
        ? '/management/dashboard'
        : '/app/dashboard';

    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError('');
            try {
                const res = await complaintsApi.getById(id);
                if (!cancelled) setData(res);
            } catch (err) {
                if (!cancelled) {
                    setError(err.message || 'Failed to load complaint');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return <p className="panel__loading">Loading complaint…</p>;
    }

    if (error) {
        return (
            <div className="page-error">
                <p>{error}</p>
                <PageHeader
                    back={{
                        fallbackTo: complaintsListPath,
                        label: listLabel
                    }}
                />
            </div>
        );
    }

    const c = data?.complaint;
    const logs = data?.logs || [];

    return (
        <div className="page-stack">
            <PageHeader
                back={{ fallbackTo: complaintsListPath, label: listLabel }}
                breadcrumbs={[
                    { to: dashboardTo, label: 'Dashboard' },
                    { to: complaintsListPath, label: listLabel },
                    { label: 'Details' }
                ]}
                title={c?.title}
                actions={
                    <div className="detail-badges">
                        <StatusBadge status={c?.status} />
                        <PriorityBadge priority={c?.priority} />
                    </div>
                }
            />

            <article className="panel">
                <p>{c?.description}</p>
                <dl className="detail-grid">
                    <div>
                        <dt>Department</dt>
                        <dd>{c?.department}</dd>
                    </div>
                    <div>
                        <dt>Category</dt>
                        <dd>{c?.category}</dd>
                    </div>
                    <div>
                        <dt>Current level</dt>
                        <dd>{c?.currentLevel}</dd>
                    </div>
                    <div>
                        <dt>Assignee</dt>
                        <dd>
                            {c?.currentAssignee?.name || '—'}
                        </dd>
                    </div>
                    <div>
                        <dt>Visibility</dt>
                        <dd>{c?.visibility}</dd>
                    </div>
                </dl>
            </article>

            <article className="panel">
                <h2>Audit trail</h2>
                {logs.length === 0 ? (
                    <p className="empty-state__sub">No log entries.</p>
                ) : (
                    <ul className="log-list">
                        {logs.map((log) => (
                            <li key={log._id}>
                                <strong>{log.action}</strong>
                                {log.newStatus
                                    ? ` → ${log.newStatus}`
                                    : ''}
                                {log.remarks ? ` — ${log.remarks}` : ''}
                                <span className="log-time">
                                    {new Date(
                                        log.createdAt
                                    ).toLocaleString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </article>
        </div>
    );
}
