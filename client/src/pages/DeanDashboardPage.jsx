/**
 * Dean dashboard — same layout as HOD / VC dashboards.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { deanApi } from '../api/client.js';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useDashboardUserStatsSync } from '../hooks/useDashboardUserStatsSync.js';
import { useComplaintsDataSync } from '../hooks/useComplaintsDataSync.js';
import { buildVcUsersListLink } from '../utils/hodUserListLinks.js';
import { DashboardHowItWorks } from '../components/DashboardHowItWorks.jsx';
import { getDashboardHowItWorksSteps } from '../config/dashboardHowItWorksSteps.jsx';

function displayValue(loading, value) {
    if (loading) return '\u2026';
    if (value === undefined || value === null) return '\u2014';
    return String(value);
}

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
        <article className="hod-stat-card" aria-label={label + ': ' + value}>
            {inner}
        </article>
    );
}

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

function useDeanStats() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError('');
        }
        try {
            const result = await deanApi.getDashboardStats();
            setData(result);
        } catch (err) {
            if (!silent) {
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

    return { data, loading, error, reload: load };
}

export function DeanDashboardPage() {
    const { user } = useAuth();
    const firstName = (user && user.name ? user.name : 'there').split(/\s+/)[0];

    useEffect(() => {
        document.title = 'Dean Dashboard | SBSSU CMS';
    }, []);

    const {
        data: statsData,
        loading: statsLoading,
        error: statsError,
        reload: reloadStats
    } = useDeanStats();

    const {
        complaints,
        loading: complaintsLoading,
        error: complaintsError,
        reload: reloadComplaints
    } = useComplaintsData({ limit: 8 });

    const stats = statsData && statsData.complaints;
    const userCounts = statsData && statsData.users;
    const complaintsListPath = '/dean/complaints';

    function statusFilterPath(status) {
        return complaintsListPath + '?status=' + status;
    }

    return (
        <div className="unified-dashboard page-stack">
            <PageHeader
                className="unified-dashboard__hero hod-dashboard__hero"
                title={
                    <span>
                        Welcome back, {firstName}.{' '}
                        <span>Your Dean dashboard.</span>
                    </span>
                }
                description="Data below reflects only records you are authorized to access."
            />

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

            <section
                className="hod-stat-grid"
                aria-label="Complaint statistics"
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

            <section
                className="hod-user-grid"
                aria-label="University account overview"
            >
                <HodUserCard
                    iconKey="graduation-cap"
                    accent="teal"
                    label="Active Students"
                    value={displayValue(
                        statsLoading,
                        userCounts && userCounts.activeStudents
                    )}
                    to={buildVcUsersListLink({ kind: 'students' })}
                />
                <HodUserCard
                    iconKey="users"
                    accent="blue"
                    label="Active Staff"
                    value={displayValue(
                        statsLoading,
                        userCounts && userCounts.activeStaff
                    )}
                    to={buildVcUsersListLink({ kind: 'staff' })}
                />
            </section>

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
                        complaintDetailBase="/dean/complaints"
                    />
                )}
            </article>

            <DashboardHowItWorks
                titleId="dean-how-title"
                steps={getDashboardHowItWorksSteps('dean', {
                    complaints: complaintsListPath
                })}
            />
        </div>
    );
}