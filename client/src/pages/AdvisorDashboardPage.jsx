/**
 * Advisor dashboard — same layout as HOD / Dean (complaint metrics + recent list).
 * No management quick actions or institution user stats.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { advisorApi } from '../api/client.js';
import { useComplaintsData } from '../hooks/useComplaintsData.js';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useComplaintsDataSync } from '../hooks/useComplaintsDataSync.js';
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

function useAdvisorStats() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
            setError('');
        }
        try {
            const result = await advisorApi.getDashboardStats();
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

    useComplaintsDataSync(() => load({ silent: true }), true);

    return { data, loading, error, reload: load };
}

export function AdvisorDashboardPage() {
    const { user } = useAuth();
    const firstName = (user && user.name ? user.name : 'there').split(/\s+/)[0];

    useEffect(() => {
        document.title = 'Advisor Dashboard | SBSSU CMS';
    }, []);

    const {
        data: statsData,
        loading: statsLoading,
        error: statsError,
        reload: reloadStats
    } = useAdvisorStats();

    const {
        complaints,
        loading: complaintsLoading,
        error: complaintsError,
        reload: reloadComplaints
    } = useComplaintsData({ limit: 8 });

    const stats = statsData && statsData.complaints;
    const department =
        (statsData && statsData.department) ||
        (user && user.department ? user.department : null);
    const complaintsListPath = '/advisor/complaints';

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
                        <span>Your Advisor dashboard.</span>
                    </span>
                }
                description={
                    department
                        ? department +
                          ' \u2014 complaints assigned to you. Data below reflects only records you are authorized to access.'
                        : 'Review and resolve complaints assigned to you. Data below reflects only records you are authorized to access.'
                }
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
                aria-label="Assigned complaint statistics"
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
                        complaintDetailBase="/advisor/complaints"
                    />
                )}
            </article>

            <DashboardHowItWorks
                titleId="advisor-how-title"
                steps={getDashboardHowItWorksSteps('advisor', {
                    complaints: complaintsListPath
                })}
            />
        </div>
    );
}