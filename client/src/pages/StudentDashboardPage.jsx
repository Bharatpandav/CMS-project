import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function StudentDashboardPage() {
    const { user } = useAuth();

    return (
        <div className="page-stack">
            <header className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back, {user?.name}.</p>
            </header>
            <article className="panel">
                <p>
                    <Link
                        to="/student/complaints/register"
                        className="link-teal"
                    >
                        Register a complaint
                    </Link>{' '}
                    or view{' '}
                    <Link to="/student/complaints" className="link-teal">
                        My Complaints
                    </Link>
                    . Update your password from{' '}
                    <Link to="/app/profile" className="link-teal">
                        My Profile
                    </Link>
                    .
                </p>
            </article>
        </div>
    );
}
