import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SummaryCard } from '../components/SummaryCard.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useComplaintsData, useCategoriesData } from '../hooks/useComplaintsData.js';
import { managementApi } from '../api/client.js';
import { canAccessManagementPortal } from '../utils/managementAccess.js';
import {
    getComplaintsListPath,
    getManagementHomePath,
    getRegisterComplaintPath
} from '../utils/appPaths.js';
import { computeComplaintStats } from '../utils/complaintStats.js';
import { getStaffBasePath, getStaffRoleLabel } from '../utils/staffRoles.js';
import { AppIcon } from '../components/AppIcon.jsx';
import { PageHeader } from '../components/PageHeader.jsx';

function useManagementStats(enabled) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        (async () => {
            try {
                const data = await managementApi.getStats();
                if (!cancelled) setStats(data.stats);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load user stats');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { stats, error };
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
                title: 'Track Status',
                text: 'Stay updated on the progress of your complaint.',
                to: '/student/complaints',
                iconKey: 'activity',
                tone: 'neutral'
            },
            {
                title: 'Support',
                text: 'Get help with categories, access, or the complaint process.',
                to: '/student/support',
                iconKey: 'life-buoy',
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

    const base = getStaffBasePath(role);
    const actions = [
        {
            title: 'Complaints',
            text: 'Review and act on complaints in your scope.',
            to: base ? `${base}/complaints` : '/complaints',
            iconKey: 'clipboard-list',
            tone: 'neutral'
        },
        {
            title: 'Categories',
            text: 'View complaint categories and routing.',
            to: base ? `${base}/categories` : '/complaints/categories',
            iconKey: 'tags',
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
        title: 'Password',
        text: 'Update your password and account security.',
        to: '/change-password',
        iconKey: 'lock',
        tone: 'neutral'
    });

    return actions.slice(0, 4);
}

export function UnifiedDashboardPage() {
    const { user } = useAuth();
    const role = user?.role;
    const isStudent = role === 'student';
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

    const { departments, loading: deptLoading } = useCategoriesData();
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

    const roleLabel = isStudent
        ? 'Student'
        : getStaffRoleLabel(role) || 'Portal';

    const firstName = (user?.name || 'there').split(/\s+/)[0];
    const listPath = getComplaintsListPath(role);
    const registerPath = getRegisterComplaintPath(role);

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

            <section
                className="summary-grid summary-grid--compact"
                aria-label="Directory metrics"
            >
                <SummaryCard
                    accent="teal"
                    label="Service departments"
                    value={deptLoading ? '…' : String(departments.length)}
                    hint="Categories available for routing complaints"
                    icon={<AppIcon name="building" />}
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
                        label="Students"
                        value={String(userStats.totalStudents ?? '—')}
                        icon={<AppIcon name="graduation-cap" />}
                    />
                    <SummaryCard
                        accent="indigo"
                        label="Staff accounts"
                        value={String(userStats.totalStaff ?? '—')}
                        icon={<AppIcon name="users" />}
                    />
                    <SummaryCard
                        accent="navy"
                        label="Active accounts"
                        value={String(userStats.activeAccounts ?? '—')}
                        icon={<AppIcon name="circle-check" />}
                    />
                </section>
            ) : null}

            <article className="panel panel--table">
                <div className="panel__header">
                    <h2>Recent complaints</h2>
                    <Link to={listPath} className="link-teal">
                        View all
                    </Link>
                </div>
                {loading ? (
                    <p className="panel__loading">Loading complaints…</p>
                ) : (
                    <RecentComplaintsTable
                        complaints={complaints.slice(0, 10)}
                        showViewAll={false}
                        viewAllPath={listPath}
                    />
                )}
            </article>

            {isStudent ? (
                <section className="unified-how" aria-labelledby="how-title">
                    <h2 id="how-title">How it works</h2>
                    <ol className="unified-how__steps">
                        <li className="unified-how__step">
                            <span className="unified-how__step-num">1</span>
                            <h3>Login</h3>
                            <p>Use your URN and password to access the portal.</p>
                        </li>
                        <li className="unified-how__step">
                            <span className="unified-how__step-num">2</span>
                            <h3>Raise complaint</h3>
                            <p>
                                {registerPath ? (
                                    <Link to={registerPath} className="link-teal">
                                        Submit details
                                    </Link>
                                ) : (
                                    'Submit details'
                                )}{' '}
                                and supporting information.
                            </p>
                        </li>
                        <li className="unified-how__step">
                            <span className="unified-how__step-num">3</span>
                            <h3>Track progress</h3>
                            <p>Follow status updates on your complaint list.</p>
                        </li>
                        <li className="unified-how__step">
                            <span className="unified-how__step-num">4</span>
                            <h3>Get resolution</h3>
                            <p>Receive outcomes from the responsible team.</p>
                        </li>
                    </ol>
                </section>
            ) : null}
        </div>
    );
}
