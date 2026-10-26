import { Link, useOutletContext } from 'react-router-dom';
import {
    IconBuilding,
    IconFileText,
    IconLayers,
    IconUpload,
    IconUserPlus,
    IconUsers
} from '../components/icons.jsx';
import { ComplaintsChart } from '../components/ComplaintsChart.jsx';
import { RecentComplaintsTable } from '../components/RecentComplaintsTable.jsx';
import { SummaryCard } from '../components/SummaryCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
    useCategoriesData,
    useComplaintsData
} from '../hooks/useComplaintsData.js';

const QUICK_ACTIONS = [
    {
        to: '/users/register',
        label: 'Register User',
        icon: <IconUserPlus />,
        tone: 'teal'
    },
    {
        to: '/users/bulk',
        label: 'Bulk Registration',
        icon: <IconUpload />,
        tone: 'blue'
    },
    {
        to: '/complaints/categories',
        label: 'Manage Categories',
        icon: <IconLayers />,
        tone: 'indigo'
    },
    {
        to: '/complaints',
        label: 'View All Complaints',
        icon: <IconFileText />,
        tone: 'navy'
    }
];

function filterBySearch(items, query) {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
        (c) =>
            c.title?.toLowerCase().includes(q) ||
            c.department?.toLowerCase().includes(q) ||
            c.category?.toLowerCase().includes(q) ||
            String(c._id).toLowerCase().includes(q) ||
            c.publicId?.toLowerCase().includes(q)
    );
}

export function DashboardPage() {
    const { user } = useAuth();
    const { search = '' } = useOutletContext() || {};
    const {
        complaints,
        total: complaintsTotal,
        loading: complaintsLoading,
        error: complaintsError,
        reload: reloadComplaints
    } = useComplaintsData({ limit: 100 });
    const {
        categories,
        departments,
        loading: catLoading,
        error: catError,
        reload: reloadCategories
    } = useCategoriesData();

    const roleTitle =
        user?.role === 'super_admin' ? 'Super Admin' : user?.name || 'Admin';

    const today = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const filteredRecent = filterBySearch(complaints, search).slice(0, 8);
    const chartData = filterBySearch(complaints, search);

    const statsLoading = complaintsLoading || catLoading;
    const statsError = complaintsError || catError;

    return (
        <div className="dashboard">
            <section className="welcome-banner">
                <div>
                    <h1>Welcome, {roleTitle}</h1>
                    <p>
                        Manage users, complaints and system settings from here.
                    </p>
                </div>
                <p className="welcome-date">{today}</p>
            </section>

            {statsError ? (
                <div className="inline-alert">
                    <span>{statsError}</span>
                    <button
                        type="button"
                        onClick={() => {
                            reloadComplaints();
                            reloadCategories();
                        }}
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            <section className="summary-grid">
                <SummaryCard
                    accent="teal"
                    icon={<IconUsers />}
                    label="Total Users"
                    value={statsLoading ? '…' : '—'}
                    hint="Requires GET /api/users list endpoint"
                />
                <SummaryCard
                    accent="blue"
                    icon={<IconFileText />}
                    label="Total Complaints"
                    value={
                        statsLoading ? '…' : String(complaintsTotal)
                    }
                    hint="In your authorized scope"
                />
                <SummaryCard
                    accent="indigo"
                    icon={<IconBuilding />}
                    label="Departments"
                    value={
                        statsLoading ? '…' : String(departments.length)
                    }
                    hint="From complaint categories"
                />
                <SummaryCard
                    accent="navy"
                    icon={<IconLayers />}
                    label="Categories"
                    value={
                        statsLoading ? '…' : String(categories.length)
                    }
                />
            </section>

            <section className="dashboard-panels">
                <article className="panel">
                    <div className="panel__header">
                        <h2>Complaints Overview</h2>
                        <span className="panel__filter">Last 30 Days</span>
                    </div>
                    {complaintsLoading ? (
                        <p className="panel__loading">Loading chart…</p>
                    ) : (
                        <ComplaintsChart complaints={chartData} />
                    )}
                </article>

                <article className="panel">
                    <div className="panel__header">
                        <h2>Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        {QUICK_ACTIONS.map((action) => (
                            <Link
                                key={action.to}
                                to={action.to}
                                className={`quick-action quick-action--${action.tone}`}
                            >
                                <span className="quick-action__icon">
                                    {action.icon}
                                </span>
                                <span>{action.label}</span>
                            </Link>
                        ))}
                    </div>
                </article>
            </section>

            <article className="panel panel--table">
                <div className="panel__header">
                    <h2>Recent Complaints</h2>
                </div>
                {complaintsLoading ? (
                    <p className="panel__loading">Loading complaints…</p>
                ) : (
                    <RecentComplaintsTable complaints={filteredRecent} />
                )}
            </article>
        </div>
    );
}
