import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SummaryCard } from '../components/SummaryCard.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { computeComplaintStats } from '../utils/complaintStats.js';
import {
    getStaffBasePath,
    getStaffRoleLabel
} from '../utils/staffRoles.js';

export function StaffDashboardPage() {
    const { user } = useAuth();
    const base = getStaffBasePath(user?.role);
    const {
        complaints,
        total,
        loading,
        error,
        reload
    } = useComplaintsData({ limit: 100 });

    const stats = useMemo(
        () => computeComplaintStats(complaints),
        [complaints]
    );

    const roleLabel = getStaffRoleLabel(user?.role);

    return (
        <div className="dashboard page-stack">
            <header className="page-header">
                <h1>{roleLabel} Dashboard</h1>
                <p>
                    Complaints in your authorized scope ({total} total from
                    server).
                </p>
            </header>

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>Retry</button>
                </div>
            ) : null}

            <section className="summary-grid">
                <SummaryCard
                    accent="teal"
                    label="Accessible complaints"
                    value={loading ? '…' : String(total)}
                    icon={<span>📋</span>}
                />
                <SummaryCard
                    accent="blue"
                    label="Pending review"
                    value={loading ? '…' : String(stats.pending)}
                    icon={<span>⏳</span>}
                />
                <SummaryCard
                    accent="indigo"
                    label="In progress"
                    value={loading ? '…' : String(stats.inProgress)}
                    icon={<span>🔄</span>}
                />
                <SummaryCard
                    accent="navy"
                    label="Resolved"
                    value={loading ? '…' : String(stats.resolved)}
                    icon={<span>✅</span>}
                />
            </section>

            {user?.role !== 'advisor' ? (
                <section className="summary-grid summary-grid--compact">
                    <SummaryCard
                        accent="blue"
                        label="Escalated"
                        value={loading ? '…' : String(stats.escalated)}
                        icon={<span>⬆️</span>}
                    />
                </section>
            ) : null}

            <article className="panel panel--table">
                <div className="panel__header">
                    <h2>Recent complaints</h2>
                    <Link to={`${base}/complaints`} className="link-teal">
                        View all
                    </Link>
                </div>
                {loading ? (
                    <p className="panel__loading">Loading…</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={complaints.slice(0, 10)}
                        showViewAll={false}
                        viewAllPath={`${base}/complaints`}
                    />
                )}
            </article>
        </div>
    );
}
