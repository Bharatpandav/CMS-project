import { useCallback, useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { complaintsApi } from '../api/client.js';
import { ComplaintDetailsView } from '../components/ComplaintDetailsView.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { isSafeInternalPath, resolveComplaintsListPath } from '../utils/navigationPaths.js';
import '../styles/complaint-detail.css';
import { useComplaintsDataSync } from '../hooks/useComplaintsDataSync.js';

export function ComplaintDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const fallbackList = resolveComplaintsListPath(user?.role, location.pathname);
    const from = location.state?.from;
    const backTo =
        typeof from === 'string' && isSafeInternalPath(from)
            ? from
            : fallbackList;
    const backLabel = backTo.includes('/all-complaints')
        ? 'All Complaints'
        : user?.role === 'student'
          ? 'My Complaints'
          : 'Complaints';

    const [data, setData] = useState(null);
    const [logs, setLogs] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const load = useCallback(
        async ({ silent = false } = {}) => {
            if (!silent) {
                setLoading(true);
                setError('');
            }
            try {
                const res = await complaintsApi.getById(id);
                setData(res);
                setLogs(res.logs || []);
            } catch (err) {
                if (!silent) {
                    setError(err.message || 'Failed to load complaint');
                }
            } finally {
                if (!silent) {
                    setLoading(false);
                }
            }
        },
        [id]
    );

    useEffect(() => {
        load();
    }, [load]);

    useComplaintsDataSync(() => load({ silent: true }), Boolean(id));

    if (loading) {
        return <p className="panel__loading">Loading complaint…</p>;
    }

    if (error || !data?.complaint) {
        return (
            <div className="page-error">
                <p>{error || 'Complaint not found'}</p>
            </div>
        );
    }

    return (
        <ComplaintDetailsView
            complaint={data.complaint}
            logs={logs}
            backTo={backTo}
            backLabel={backLabel}
            canRevealContact={Boolean(data.canRevealContact)}
            currentUser={user}
            onMembershipChange={async () => {
                const res = await complaintsApi.getById(id);
                setData(res);
                setLogs(res.logs || []);
            }}
        />
    );
}
