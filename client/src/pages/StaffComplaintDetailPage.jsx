import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ComplaintDetailsView } from '../components/ComplaintDetailsView.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { isSafeInternalPath, resolveComplaintsListPath } from '../utils/navigationPaths.js';
import '../styles/complaint-detail.css';
import { complaintsApi, staffApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
export function StaffComplaintDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const listPath = resolveComplaintsListPath(
        user?.role,
        location.pathname
    );
    const from = location.state?.from;
    const backTo =
        typeof from === 'string' && isSafeInternalPath(from)
            ? from
            : listPath;

    const [data, setData] = useState(null);
    const [canRevealContact, setCanRevealContact] = useState(false);
    const [assignable, setAssignable] = useState([]);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [remarks, setRemarks] = useState('');
    const [assignToId, setAssignToId] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await complaintsApi.getById(id);
            setData(res);
            setCanRevealContact(Boolean(res.canRevealContact));
            const dept = res.complaint?.department;
            if (
                dept &&
                (user?.role === 'hod' || user?.role === 'dean')
            ) {
                try {
                    const assignRes =
                        await staffApi.getAssignableUsers(dept);
                    setAssignable(assignRes.users || []);
                } catch {
                    setAssignable([]);
                }
            }
        } catch (err) {
            setError(err.message || 'Failed to load complaint');
        } finally {
            setLoading(false);
        }
    }, [id, user?.role]);

    useEffect(() => {
        load();
    }, [load]);

    const runAction = async (fn) => {
        setActionError('');
        setActionSuccess('');
        setSubmitting(true);
        try {
            await fn();
            setActionSuccess('Action completed successfully.');
            setRemarks('');
            setAssignToId('');
            await load();
        } catch (err) {
            setActionError(err.message || 'Action failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <p className="panel__loading">Loading complaint…</p>;
    }

    if (error) {
        return (
            <div className="page-error">
                <p>{error}</p>
                <PageHeader
                    back={{ fallbackTo: listPath, label: 'Complaints' }}
                />
            </div>
        );
    }

    const c = data?.complaint;
    const logs = data?.logs || [];
    const terminal = ['resolved', 'rejected', 'withdrawn'].includes(c?.status);
    const role = user?.role;

    const canAcceptReject =
        !terminal &&
        ['advisor', 'hod', 'dean', 'super_admin'].includes(role);
    const canAssign =
        !terminal && (role === 'hod' || role === 'dean');
    const canEscalate =
        !terminal &&
        (role === 'advisor' ||
            role === 'hod' ||
            role === 'dean');
    const canResolve =
        !terminal &&
        ['advisor', 'hod', 'dean', 'super_admin'].includes(role);

    return (
        <div className="page-stack">
            <ComplaintDetailsView
                complaint={c}
                logs={logs}
                backTo={backTo}
                backLabel="Complaints"
                canRevealContact={canRevealContact}
                currentUser={user}
                onMembershipChange={load}
            />

            {actionError ? (
                <p className="form-error" role="alert">{actionError}</p>
            ) : null}
            {actionSuccess ? (
                <p className="form-success" role="status">{actionSuccess}</p>
            ) : null}

            {!terminal ? (
                    <article className="panel staff-actions-panel">
                        <h2>Actions</h2>

                        {canAcceptReject ? (
                            <div className="action-block">
                                <h3>Accept / Reject</h3>
                                <textarea
                                    rows={2}
                                    placeholder="Reason (required for reject)"
                                    value={remarks}
                                    onChange={(e) =>
                                        setRemarks(e.target.value)
                                    }
                                    disabled={submitting}
                                />
                                <div className="form-actions">
                                    <button
                                        type="button"
                                        className="profile-btn-primary"
                                        disabled={submitting}
                                        onClick={() =>
                                            runAction(() =>
                                                complaintsApi.updateStatus(
                                                    id,
                                                    {
                                                        action: 'accepted',
                                                        remarks
                                                    }
                                                )
                                            )
                                        }
                                    >
                                        Accept
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-cancel"
                                        disabled={submitting}
                                        onClick={() => {
                                            if (!remarks.trim()) {
                                                setActionError(
                                                    'Rejection reason is required'
                                                );
                                                return;
                                            }
                                            runAction(() =>
                                                complaintsApi.updateStatus(
                                                    id,
                                                    {
                                                        action: 'rejected',
                                                        remarks
                                                    }
                                                )
                                            );
                                        }}
                                    >
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {canAssign ? (
                            <div className="action-block">
                                <h3>Assign / Forward</h3>
                                <select
                                    value={assignToId}
                                    onChange={(e) =>
                                        setAssignToId(e.target.value)
                                    }
                                    disabled={submitting}
                                >
                                    <option value="">
                                        Select assignee
                                    </option>
                                    {assignable.map((u) => (
                                        <option key={u._id} value={u._id}>
                                            {u.name} ({u.role}) — {u.email}
                                        </option>
                                    ))}
                                </select>
                                <textarea
                                    rows={2}
                                    placeholder="Assignment reason (required)"
                                    value={remarks}
                                    onChange={(e) =>
                                        setRemarks(e.target.value)
                                    }
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    className="profile-btn-primary"
                                    disabled={submitting || !assignToId}
                                    onClick={() => {
                                        if (!remarks.trim()) {
                                            setActionError(
                                                'Assignment reason is required'
                                            );
                                            return;
                                        }
                                        runAction(() =>
                                            complaintsApi.assign(id, {
                                                assignToId,
                                                remarks
                                            })
                                        );
                                    }}
                                >
                                    Assign
                                </button>
                            </div>
                        ) : null}

                        {canEscalate ? (
                            <div className="action-block">
                                <h3>
                                    {role === 'advisor'
                                        ? 'Return to HOD'
                                        : 'Escalate'}
                                </h3>
                                <textarea
                                    rows={2}
                                    placeholder="Reason (required)"
                                    value={remarks}
                                    onChange={(e) =>
                                        setRemarks(e.target.value)
                                    }
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    disabled={submitting}
                                    onClick={() => {
                                        if (!remarks.trim()) {
                                            setActionError(
                                                'Escalation reason is required'
                                            );
                                            return;
                                        }
                                        runAction(() =>
                                            complaintsApi.escalate(id, {
                                                remarks
                                            })
                                        );
                                    }}
                                >
                                    {role === 'advisor'
                                        ? 'Return to HOD'
                                        : role === 'hod'
                                        ? 'Escalate to Dean'
                                        : 'Escalate to VC'}
                                </button>
                            </div>
                        ) : null}

                        {canResolve ? (
                            <div className="action-block">
                                <h3>Resolve</h3>
                                <textarea
                                    rows={3}
                                    placeholder="Resolution note (required)"
                                    value={remarks}
                                    onChange={(e) =>
                                        setRemarks(e.target.value)
                                    }
                                    disabled={submitting}
                                />
                                <button
                                    type="button"
                                    className="profile-btn-primary"
                                    disabled={submitting}
                                    onClick={() => {
                                        if (!remarks.trim()) {
                                            setActionError(
                                                'Resolution note is required'
                                            );
                                            return;
                                        }
                                        runAction(() =>
                                            complaintsApi.resolve(id, {
                                                remarks
                                            })
                                        );
                                    }}
                                >
                                    Mark resolved
                                </button>
                            </div>
                        ) : null}
                    </article>
                ) : null}

            <article className="panel">
                <h2>Audit history</h2>
                {logs.length === 0 ? (
                    <p className="empty-state__sub">No log entries.</p>
                ) : (
                    <ul className="log-list">
                        {logs.map((log) => (
                            <li key={log._id}>
                                <strong>{log.action}</strong>
                                {log.actorRole
                                    ? ` · ${log.actorRole}`
                                    : ''}
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
