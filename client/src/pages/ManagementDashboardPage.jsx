import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { managementApi } from '../api/client.js';
import { ComplaintsOverviewChart } from '../components/management/ComplaintsOverviewChart.jsx';
import { ManagementRecentComplaints } from '../components/management/ManagementRecentComplaints.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useComplaintsData, useCategoriesData } from '../hooks/useComplaintsData.js';
import {
    canManageUsers,
    getComplaintsListPathForManagement,
    getManagementQuickActions,
    getManagementRoleLabel
} from '../config/managementPortalNav.js';
import { computeComplaintStats } from '../utils/complaintStats.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

function formatToday() {
    return new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function MgmtStatCard({ iconKey, tone, label, value, sub }) {
    return (
        <article className="mgmt-stat-card">
            <div className="mgmt-stat-card__row">
                <div>
                    <p className="mgmt-stat-card__label">{label}</p>
                    <p className="mgmt-stat-card__value">{value}</p>
                    {sub ? <p className="mgmt-stat-card__sub">{sub}</p> : null}
                </div>
                <div
                    className={`mgmt-stat-card__icon mgmt-stat-card__icon--${tone}`}
                    aria-hidden="true"
                >
                    <AppIcon name={iconKey} size="lg" />
                </div>
            </div>
        </article>
    );
}

export function ManagementDashboardPage() {
    const { user } = useAuth();
    const role = user?.role;
    const [chartDays, setChartDays] = useState(30);
    const [userStats, setUserStats] = useState(null);
    const [userStatsError, setUserStatsError] = useState('');
    const [userStatsLoading, setUserStatsLoading] = useState(false);

    const {
        complaints,
        total: complaintTotal,
        loading: complaintsLoading,
        error: complaintsError,
        reload
    } = useComplaintsData({ limit: 200 });

    const {
        categories,
        departments,
        loading: catLoading
    } = useCategoriesData();

    const complaintStats = useMemo(
        () => computeComplaintStats(complaints),
        [complaints]
    );

    const quickActions = useMemo(
        () => getManagementQuickActions(user),
        [user]
    );

    const complaintsPath = getComplaintsListPathForManagement();
    const detailBase = '/management/complaints';

    useEffect(() => {
        if (!canManageUsers(role)) return;
        let cancelled = false;
        (async () => {
            setUserStatsLoading(true);
            setUserStatsError('');
            try {
                const data = await managementApi.getStats();
                if (!cancelled) setUserStats(data.stats);
            } catch (err) {
                if (!cancelled) {
                    setUserStatsError(
                        err.message || 'Could not load user statistics'
                    );
                }
            } finally {
                if (!cancelled) setUserStatsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [role]);

    const roleLabel = getManagementRoleLabel(role);
    const showUserStats = canManageUsers(role);

    return (
        <div className="mgmt-dashboard">
            <PageHeader
                className="mgmt-dash-head"
                title={`Welcome, ${roleLabel}`}
                description={
                    showUserStats
                        ? 'Manage users, complaints and system settings from here.'
                        : 'Review assigned complaints and authorized management tasks.'
                }
                actions={
                    <div className="mgmt-dash-date" aria-live="polite">
                        <AppIcon name="calendar" size="sm" />
                        {formatToday()}
                    </div>
                }
            />

            {complaintsError ? (
                <div className="inline-alert">
                    <span>{complaintsError}</span>
                    <button type="button" onClick={reload}>Retry</button>
                </div>
            ) : null}
            {userStatsError ? (
                <p className="form-error">{userStatsError}</p>
            ) : null}

            <section className="mgmt-stat-grid" aria-label="Summary statistics">
                {showUserStats ? (
                    <MgmtStatCard
                        tone="blue"
                        iconKey="users"
                        label="Total Users"
                        value={
                            userStatsLoading
                                ? '…'
                                : String(userStats?.totalUsers ?? '—')
                        }
                        sub={
                            userStats
                                ? `${userStats.totalStudents} Students | ${userStats.totalStaff} Staff`
                                : ''
                        }
                    />
                ) : (
                    <MgmtStatCard
                        tone="blue"
                        iconKey="clipboard-list"
                        label="Complaints in scope"
                        value={
                            complaintsLoading ? '…' : String(complaintTotal)
                        }
                        sub="Authorized complaint records"
                    />
                )}
                <MgmtStatCard
                    tone="orange"
                    iconKey="file-text"
                    label="Total Complaints"
                    value={complaintsLoading ? '…' : String(complaintTotal)}
                    sub={`${complaintStats.pending} Pending | ${complaintStats.resolved} Resolved`}
                />
                <MgmtStatCard
                    tone="purple"
                    iconKey="building"
                    label="Departments"
                    value={catLoading ? '…' : String(departments.length)}
                    sub="From active complaint categories"
                />
                <MgmtStatCard
                    tone="green"
                    iconKey="tags"
                    label="Categories"
                    value={catLoading ? '…' : String(categories.length)}
                    sub="Mapped to departments"
                />
            </section>

            <section className="mgmt-mid-grid">
                <article className="mgmt-panel">
                    <div className="mgmt-panel__head">
                        <h2>Complaints Overview</h2>
                        <select
                            value={chartDays}
                            onChange={(e) =>
                                setChartDays(Number(e.target.value))
                            }
                            aria-label="Chart time range"
                        >
                            <option value={7}>Last 7 Days</option>
                            <option value={30}>Last 30 Days</option>
                        </select>
                    </div>
                    <ComplaintsOverviewChart
                        complaints={complaints}
                        days={chartDays}
                        loading={complaintsLoading}
                        error={complaintsError}
                    />
                </article>

                <article className="mgmt-panel">
                    <div className="mgmt-panel__head">
                        <h2>Quick Actions</h2>
                    </div>
                    <div className="mgmt-quick-grid">
                        {quickActions.map((action) => (
                            <Link
                                key={action.key}
                                to={action.to}
                                className={`mgmt-quick-card mgmt-quick-card--${action.tone}`}
                            >
                                <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                                    <span className="mgmt-quick-card__icon">
                                        →
                                    </span>
                                    <div>
                                        <p className="mgmt-quick-card__title">
                                            {action.title}
                                        </p>
                                        <p className="mgmt-quick-card__sub">
                                            {action.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <span aria-hidden="true">›</span>
                            </Link>
                        ))}
                    </div>
                </article>
            </section>

            <article className="mgmt-panel">
                <div className="mgmt-panel__head">
                    <h2>Recent Complaints</h2>
                    <Link to={complaintsPath} className="link-teal">
                        View All
                    </Link>
                </div>
                {complaintsLoading ? (
                    <p className="mgmt-chart-empty">Loading complaints…</p>
                ) : (
                    <ManagementRecentComplaints
                        complaints={complaints.slice(0, 8)}
                        detailBase={detailBase}
                        viewAllPath={complaintsPath}
                    />
                )}
            </article>
        </div>
    );
}
