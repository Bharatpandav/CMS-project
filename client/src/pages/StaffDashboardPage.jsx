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
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

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
            <PageHeader
                title={`${roleLabel} dashboard`}
                description={`Complaints in your authorized scope (${total} total from server).`}
            />

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
                    icon={<AppIcon name="clipboard-list" />}
                />
                <SummaryCard
                    accent="blue"
                    label="Pending review"
                    value={loading ? '…' : String(stats.pending)}
                    icon={<AppIcon name="hourglass" />}
                />
                <SummaryCard
                    accent="indigo"
                    label="In progress"
                    value={loading ? '…' : String(stats.inProgress)}
                    icon={<AppIcon name="refresh" />}
                />
                <SummaryCard
                    accent="navy"
                    label="Resolved"
                    value={loading ? '…' : String(stats.resolved)}
                    icon={<AppIcon name="circle-check" />}
                />
            </section>

            {user?.role !== 'advisor' ? (
                <section className="summary-grid summary-grid--compact">
                    <SummaryCard
                        accent="blue"
                        label="Escalated"
                        value={loading ? '…' : String(stats.escalated)}
                        icon={<AppIcon name="arrow-up" />}
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
