import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';

const STATUS_OPTIONS = [
    { value: '', label: 'All statuses' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'rejected', label: 'Rejected' }
];

export function StaffComplaintsPage() {
    const { search = '' } = useOutletContext() || {};
    const [statusFilter, setStatusFilter] = useState('');
    const { complaints, loading, error, reload } = useComplaintsData({
        limit: 100,
        status: statusFilter || undefined
    });

    const filtered = useMemo(() => {
        const q = (search || '').trim().toLowerCase();
        if (!q) return complaints;
        return complaints.filter(
            (c) =>
                c.title?.toLowerCase().includes(q) ||
                c.department?.toLowerCase().includes(q) ||
                c.category?.toLowerCase().includes(q) ||
                String(c._id).toLowerCase().includes(q)
        );
    }, [complaints, search]);

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Complaints</h1>
                <p>Complaints you are authorized to view and manage.</p>
            </header>

            <div className="staff-filters">
                <label>
                    Status
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

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
                        complaints={filtered}
                        showViewAll={false}
                    />
                )}
            </article>
        </div>
    );
}
