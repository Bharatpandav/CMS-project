import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { SummaryCard } from '../components/SummaryCard.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { managementApi } from '../api/client.js';
import { canAccessManagementPortal } from '../utils/managementAccess.js';
import {
    getComplaintsListPath,
    getManagementHomePath
} from '../utils/appPaths.js';
import { computeComplaintStats } from '../utils/complaintStats.js';
import { getStaffBasePath, getStaffRoleLabel } from '../utils/staffRoles.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useDashboardUserStatsSync } from '../hooks/useDashboardUserStatsSync.js';
import { DashboardHowItWorks } from '../components/DashboardHowItWorks.jsx';
import { getDashboardHowItWorksSteps } from '../config/dashboardHowItWorksSteps.jsx';

function useManagementStats(enabled) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!enabled) return;
        try {
            const data = await managementApi.getStats();
            setStats(data.stats);
            if (!silent) setError('');
        } catch (err) {
            if (!silent) {
                setError(err.message || 'Failed to load user stats');
            }
        }
    }, [enabled]);

    useEffect(() => {
        load();
    }, [load]);

    useDashboardUserStatsSync(() => load({ silent: true }), enabled);

    return { stats, error, reload: load };
}

function buildQuickActions(role) {
    if (role === 'student') {
        return [
            {
                title: 'Raise Complaint',
                text: 'Report your issues easily in just a few clicks.',
                to: '/student/complaints/register',
                iconKey: 'file-plus',
                tone: 'neutral'
            },
            {
                title: 'All Complaints',
                text: 'Browse the latest public complaints across the university.',
                to: '/student/all-complaints',
                iconKey: 'activity',
                tone: 'neutral'
            },
            {
                title: 'My Profile',
                text: 'View your details and change your password.',
                to: '/app/profile',
                iconKey: 'user',
                tone: 'neutral'
            }
        ];
    }

    // HOD has its own dedicated dashboard — quick actions there are department-focused.
    // For non-HOD staff (advisor, dean, super_admin) use the generic staff actions.
    const base = getStaffBasePath(role);
    const actions = [
        {
            title: 'Complaints',
            text: 'Review and act on complaints in your scope.',
            to: base ? `${base}/complaints` : '/complaints',
            iconKey: 'clipboard-list',
            tone: 'neutral'
        }
    ];

    const mgmt = getManagementHomePath(role);
    if (mgmt) {
        actions.push({
            title: 'User Management',
            text: 'Register, import, and manage university accounts.',
            to: mgmt,
            iconKey: 'users',
            tone: 'neutral'
        });
    }

    actions.push({
        title: 'My Profile',
        text: 'View your details and update your password.',
        to: '/app/profile',
        iconKey: 'user',
        tone: 'neutral'
    });

    return actions.slice(0, 4);
}

export function UnifiedDashboardPage() {
    const { user } = useAuth();
    const role = user?.role;
    const isStudent = role === 'student';

    useEffect(() => {
        document.title = 'Dashboard | SBSSU CMS';
    }, []);

    const showMgmtStats = canAccessManagementPortal(role);

    const {
        complaints,
        total,
        loading,
        error,
        reload
    } = useComplaintsData({
        limit: 100,
        myComplaints: isStudent
    });

    const {
        complaints: publicComplaints,
        loading: publicLoading,
        error: publicError,
        reload: reloadPublic
    } = useComplaintsData({
        limit: 8,
        publicFeed: isStudent,
        myComplaints: isStudent ? undefined : true
    });

    const { stats: userStats, error: userStatsError } =
        useManagementStats(showMgmtStats);

    const complaintStats = useMemo(
        () => computeComplaintStats(complaints),
        [complaints]
    );

    const quickActions = useMemo(
        () => buildQuickActions(role),
        [role]
    );

    if (role === 'student') {
        return <Navigate to="/student/dashboard" replace />;
    }

    // HODs have a dedicated department-scoped dashboard
    if (role === 'hod') {
        return <Navigate to="/hod/dashboard" replace />;
    }

    if (role === 'super_admin') {
        return <Navigate to="/vc/dashboard" replace />;
    }

    if (role === 'dean') {
        return <Navigate to="/dean/dashboard" replace />;
    }

    if (role === 'advisor') {
        return <Navigate to="/advisor/dashboard" replace />;
    }

    const roleLabel = isStudent
        ? 'Student'
        : getStaffRoleLabel(role) || 'Portal';

    const firstName = (user?.name || 'there').split(/\s+/)[0];
    const listPath = getComplaintsListPath(role);

    return (
        <div className="unified-dashboard page-stack">
            <PageHeader
                className="unified-dashboard__hero"
                title={
                    <>
                        Welcome back, {firstName}.{' '}
                        <span>Your {roleLabel} dashboard.</span>
                    </>
                }
                description="Raise, track, and resolve complaints with a transparent workflow. Data below reflects only records you are authorized to access."
            />

            {error ? (
                <div className="inline-alert">
                    <span>{error}</span>
                    <button type="button" onClick={reload}>Retry</button>
                </div>
            ) : null}
            {userStatsError ? (
                <p className="form-error">{userStatsError}</p>
            ) : null}

            <section className="unified-feature-grid" aria-label="Quick actions">
                {quickActions.map((card) => (
                    <Link
                        key={card.title}
                        to={card.to}
                        className="unified-feature-card"
                    >
                        <div
                            className={`unified-feature-card__icon unified-feature-card__icon--${card.tone}`}
                            aria-hidden="true"
                        >
                            <AppIcon name={card.iconKey} size="lg" />
                        </div>
                        <h3>{card.title}</h3>
                        <p>{card.text}</p>
                    </Link>
                ))}
            </section>

            <section className="summary-grid" aria-label="Complaint metrics">
                <SummaryCard
                    accent="teal"
                    label={isStudent ? 'My complaints' : 'Accessible complaints'}
                    value={loading ? '…' : String(total)}
                    icon={<AppIcon name="clipboard-list" />}
                />
                <SummaryCard
                    accent="blue"
                    label="Pending review"
                    value={loading ? '…' : String(complaintStats.pending)}
                    icon={<AppIcon name="hourglass" />}
                />
                <SummaryCard
                    accent="indigo"
                    label="In progress"
                    value={loading ? '…' : String(complaintStats.inProgress)}
                    icon={<AppIcon name="refresh" />}
                />
                <SummaryCard
                    accent="navy"
                    label="Resolved"
                    value={loading ? '…' : String(complaintStats.resolved)}
                    icon={<AppIcon name="circle-check" />}
                />
            </section>

            {!isStudent && role !== 'advisor' ? (
                <section className="summary-grid summary-grid--compact">
                    <SummaryCard
                        accent="blue"
                        label="Escalated"
                        value={loading ? '…' : String(complaintStats.escalated)}
                        icon={<AppIcon name="arrow-up" />}
                    />
                </section>
            ) : null}

            {showMgmtStats && userStats ? (
                <section className="summary-grid summary-grid--compact">
                    <SummaryCard
                        accent="teal"
                        label="Active Students"
                        value={String(
                            userStats.activeStudents ??
                                userStats.totalStudents ??
                                '\u2014'
                        )}
                        icon={<AppIcon name="graduation-cap" />}
                    />
                    <SummaryCard
                        accent="indigo"
                        label="Active Staff"
                        value={String(
                            userStats.activeStaff ??
                                userStats.totalStaff ??
                                '\u2014'
                        )}
                        icon={<AppIcon name="users" />}
                    />
                    {/* Active accounts: only shown to super_admin / dean — not HOD (they have dept-specific counts on their own dashboard) */}
                    {role !== 'hod' ? (
                        <SummaryCard
                            accent="navy"
                            label="Active accounts"
                            value={String(userStats.activeAccounts ?? '\u2014')}
                            icon={<AppIcon name="circle-check" />}
                        />
                    ) : null}
                </section>
            ) : null}

            <article className="panel panel--table">
                <div className="panel__header">
                    <h2>Recent complaints</h2>
                    <Link
                        to={
                            isStudent
                                ? '/student/all-complaints'
                                : listPath
                        }
                        className="link-teal"
                    >
                        View all
                    </Link>
                </div>
                {publicError ? (
                    <div className="inline-alert">
                        <span>{publicError}</span>
                        <button type="button" onClick={reloadPublic}>
                            Retry
                        </button>
                    </div>
                ) : null}
                {publicLoading ? (
                    <p className="panel__loading">Loading complaints…</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={publicComplaints.slice(0, 8)}
                        showViewAll={false}
                        complaintDetailBase={
                            isStudent ? '/student/complaints' : undefined
                        }
                    />
                )}
            </article>

            {role === 'advisor' ? (
                <DashboardHowItWorks
                    titleId="advisor-how-title"
                    steps={getDashboardHowItWorksSteps('advisor', {
                        complaints: listPath
                    })}
                />
            ) : null}
        </div>
    );
}
