/**
 * HodDashboardPage
 *
 * Department-specific HOD dashboard. All data is scoped to the HOD's own
 * department — resolved server-side from their authenticated account record.
 *
 * Features:
 *  - 5 complaint metric cards (Total, Accepted, Rejected, Pending, Resolved)
 *  - Active Students + Active Staff counts (no global Active Accounts)
 *  - Recent Complaints table (department-scoped)
 *  - Proper loading / error / no-department states
 *  - No Categories or Password quick-action cards
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { hodApi } from '../api/client.js';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useDashboardUserStatsSync } from '../hooks/useDashboardUserStatsSync.js';
import { useComplaintsDataSync } from '../hooks/useComplaintsDataSync.js';
import { buildHodUsersListLink } from '../utils/hodUserListLinks.js';
import { DashboardHowItWorks } from '../components/DashboardHowItWorks.jsx';
import { getDashboardHowItWorksSteps } from '../config/dashboardHowItWorksSteps.jsx';

// ---- helpers ---------------------------------------------------------------

function displayValue(loading, value) {
    if (loading) return '\u2026';
    if (value === undefined || value === null) return '\u2014';
    return String(value);
}

// ---- stat card -------------------------------------------------------------

function HodStatCard({ iconKey, accent, label, value, to }) {
    const inner = (
        <>
            <div
                className={'hod-stat-card__icon hod-stat-card__icon--' + accent}
                aria-hidden="true"
            >
                <AppIcon name={iconKey} size="lg" />
            </div>
            <div className="hod-stat-card__body">
                <p className="hod-stat-card__value">{value}</p>
                <p className="hod-stat-card__label">{label}</p>
            </div>
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                className="hod-stat-card hod-stat-card--link"
                aria-label={label + ': ' + value + '. Click to view.'}
            >
                {inner}
            </Link>
        );
    }

    return (
        <article
            className="hod-stat-card"
            aria-label={label + ': ' + value}
        >
            {inner}
        </article>
    );
}

// ---- user count card -------------------------------------------------------

function HodUserCard({ iconKey, accent, label, value, to }) {
    const inner = (
        <>
            <div className="hod-user-card__icon" aria-hidden="true">
                <AppIcon name={iconKey} size="lg" />
            </div>
            <div className="hod-user-card__body">
                <p className="hod-user-card__value">{value}</p>
                <p className="hod-user-card__label">{label}</p>
            </div>
        </>
    );

    if (to) {
        return (
            <Link
                to={to}
                className={
                    'hod-user-card hod-user-card--link hod-user-card--' + accent
                }
                aria-label={label + ': ' + value + '. View filtered user list.'}
            >
                {inner}
            </Link>
        );
    }

    return (
        <article className={'hod-user-card hod-user-card--' + accent}>
            {inner}
        </article>
    );
}

// ---- hook: HOD stats -------------------------------------------------------

function useHodStats() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [noDepartment, setNoDepartment] = useState(false);

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError('');
            setNoDepartment(false);
        }
        try {
            const result = await hodApi.getDashboardStats();
            setData(result);
        } catch (err) {
            if (err.data && err.data.noDepartment) {
                setNoDepartment(true);
            } else if (!silent) {
                setError(err.message || 'Could not load dashboard statistics');
            }
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useDashboardUserStatsSync(() => load({ silent: true }), true);
    useComplaintsDataSync(() => load({ silent: true }), true);

    return { data, loading, error, noDepartment, reload: load };
}

// ---- page ------------------------------------------------------------------

export function HodDashboardPage() {
    const { user } = useAuth();
    const firstName = (user && user.name ? user.name : 'there').split(/\s+/)[0];

    useEffect(() => {
        document.title = 'HOD Dashboard | SBSSU CMS';
    }, []);

    const {
        data: statsData,
        loading: statsLoading,
        error: statsError,
        noDepartment,
        reload: reloadStats
    } = useHodStats();

    // Recent complaints — uses same /api/complaints/get endpoint;
    // backend already scopes HOD to their department via getListFilterForRole.
    const {
        complaints,
        loading: complaintsLoading,
        error: complaintsError,
        reload: reloadComplaints
    } = useComplaintsData({ limit: 8 });

    const department = (statsData && statsData.department)
        ? statsData.department
        : (user && user.department ? user.department : null);
    const stats = statsData && statsData.complaints;
    const userCounts = statsData && statsData.users;

    const complaintsListPath = '/hod/complaints';

    function statusFilterPath(status) {
        return complaintsListPath + '?status=' + status;
    }

    // ---- Render: no department configuration --------------------------------
    if (!statsLoading && noDepartment) {
        return (
            <div className="unified-dashboard page-stack">
                <PageHeader
                    className="unified-dashboard__hero"
                    title={
                        <span>
                            Welcome back, {firstName}. <span>Your HOD dashboard.</span>
                        </span>
                    }
                    description="Department configuration required."
                />
                <div className="hod-config-notice" role="alert">
                    <div className="hod-config-notice__icon">
                        <AppIcon name="circle-alert" size="xl" />
                    </div>
                    <h2>Department Not Configured</h2>
                    <p>
                        Your HOD account does not have a department assigned.
                        Please contact the system administrator to configure
                        your department association before you can access
                        department-specific data.
                    </p>
                </div>
            </div>
        );
    }

    // ---- Render: dashboard --------------------------------------------------
    return (
        <div className="unified-dashboard page-stack">
            {/* Header */}
            <PageHeader
                className="unified-dashboard__hero hod-dashboard__hero"
                title={
                    <span>
                        Welcome back, {firstName}. <span>Your HOD dashboard.</span>
                    </span>
                }
                description={
                    department
                        ? department + ' \u2014 HOD Dashboard. Data below reflects only records you are authorized to access.'
                        : 'Raise, track, and resolve complaints with a transparent workflow. Data below reflects only records you are authorized to access.'
                }
            />

            {/* Errors */}
            {statsError ? (
                <div className="inline-alert" role="alert">
                    <span>{statsError}</span>
                    <button type="button" onClick={reloadStats}>
                        Retry
                    </button>
                </div>
            ) : null}
            {complaintsError ? (
                <div className="inline-alert" role="alert">
                    <span>{complaintsError}</span>
                    <button type="button" onClick={reloadComplaints}>
                        Retry
                    </button>
                </div>
            ) : null}

            {/* Complaint Statistics — 5 metrics */}
            <section
                className="hod-stat-grid"
                aria-label="Department complaint statistics"
            >
                <HodStatCard
                    iconKey="clipboard-list"
                    accent="navy"
                    label="Total Complaints"
                    value={displayValue(statsLoading, stats && stats.total)}
                    to={complaintsListPath}
                />
                <HodStatCard
                    iconKey="circle-check"
                    accent="teal"
                    label="Accepted"
                    value={displayValue(statsLoading, stats && stats.accepted)}
                    to={statusFilterPath('accepted')}
                />
                <HodStatCard
                    iconKey="circle-alert"
                    accent="red"
                    label="Rejected"
                    value={displayValue(statsLoading, stats && stats.rejected)}
                    to={statusFilterPath('rejected')}
                />
                <HodStatCard
                    iconKey="hourglass"
                    accent="blue"
                    label="Pending"
                    value={displayValue(statsLoading, stats && stats.pending)}
                    to={statusFilterPath('pending')}
                />
                <HodStatCard
                    iconKey="badge-check"
                    accent="green"
                    label="Resolved"
                    value={displayValue(statsLoading, stats && stats.resolved)}
                    to={statusFilterPath('resolved')}
                />
            </section>

            {/* Department Account Overview */}
            <section
                className="hod-user-grid"
                aria-label="Department account overview"
            >
                <HodUserCard
                    iconKey="graduation-cap"
                    accent="teal"
                    label="Active Students"
                    value={displayValue(statsLoading, userCounts && userCounts.activeStudents)}
                    to={
                        department
                            ? buildHodUsersListLink({ kind: 'students' })
                            : undefined
                    }
                />
                <HodUserCard
                    iconKey="users"
                    accent="blue"
                    label="Active Staff"
                    value={displayValue(statsLoading, userCounts && userCounts.activeStaff)}
                    to={
                        department
                            ? buildHodUsersListLink({ kind: 'staff' })
                            : undefined
                    }
                />
            </section>

            {/* Recent Complaints */}
            <article className="panel panel--table">
                <div className="panel__header">
                    <h2>Recent complaints</h2>
                    <Link to={complaintsListPath} className="link-teal">
                        View all
                    </Link>
                </div>
                {complaintsLoading ? (
                    <p className="panel__loading">Loading complaints\u2026</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={complaints.slice(0, 8)}
                        showViewAll={false}
                        viewAllPath={complaintsListPath}
                        complaintDetailBase="/hod/complaints"
                    />
                )}
            </article>

            <DashboardHowItWorks
                titleId="hod-how-title"
                steps={getDashboardHowItWorksSteps('hod', {
                    complaints: complaintsListPath
                })}
            />
        </div>
    );
}
