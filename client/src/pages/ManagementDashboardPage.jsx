import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { managementApi } from '../api/client.js';
import { SummaryCard } from '../components/SummaryCard.jsx';

export function ManagementDashboardPage() {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await managementApi.getStats();
                setStats(data.stats);
            } catch (err) {
                setError(err.message || 'Failed to load statistics');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Management Dashboard</h1>
                <p>University user accounts and registrations.</p>
            </header>
            {error ? <p className="form-error">{error}</p> : null}
            <section className="summary-grid">
                <SummaryCard accent="teal" label="Total Users" value={loading ? '…' : String(stats?.totalUsers ?? '—')} icon={<span>👥</span>} />
                <SummaryCard accent="blue" label="Students" value={loading ? '…' : String(stats?.totalStudents ?? '—')} icon={<span>🎓</span>} />
                <SummaryCard accent="indigo" label="Administrators / Staff" value={loading ? '…' : String(stats?.totalStaff ?? '—')} icon={<span>🛡️</span>} />
                <SummaryCard accent="navy" label="Active Accounts" value={loading ? '…' : String(stats?.activeAccounts ?? '—')} icon={<span>✅</span>} />
            </section>
            <section className="summary-grid summary-grid--compact">
                <SummaryCard accent="blue" label="Inactive Accounts" value={loading ? '…' : String(stats?.inactiveAccounts ?? '—')} icon={<span>⏸️</span>} />
            </section>
            <article className="panel">
                <p>
                    <Link to="/management/users" className="link-teal">Manage all users</Link>
                    {' · '}
                    <Link to="/management/register" className="link-teal">Register user</Link>
                    {' · '}
                    <Link to="/management/bulk" className="link-teal">Bulk import</Link>
                </p>
            </article>
        </div>
    );
}
