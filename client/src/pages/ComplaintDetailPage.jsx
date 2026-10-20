import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { complaintsApi } from '../api/client.js';
import { PriorityBadge, StatusBadge } from '../components/StatusBadge.jsx';

export function ComplaintDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const complaintsListPath =
        user?.role === 'student' ? '/student/complaints' : '/complaints';
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
                <Link to={complaintsListPath}>Back to complaints</Link>
            </div>
        );
    }

    const c = data?.complaint;
    const logs = data?.logs || [];

    return (
        <div className="page-stack">
            <header className="page-header">
                <Link to={complaintsListPath} className="link-teal">
                    ← All complaints
                </Link>
                <h1>{c?.title}</h1>
                <div className="detail-badges">
                    <StatusBadge status={c?.status} />
                    <PriorityBadge priority={c?.priority} />
                </div>
            </header>

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
