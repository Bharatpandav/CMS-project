import { Link, useNavigate } from 'react-router-dom';
import '../styles/home.css';
import { useAuth } from '../context/AuthContext.jsx';
import {
    getStaffDashboardPath,
    isAdminStaffRole
} from '../utils/staffRoles.js';

const ROLE_LABELS = {
    student: 'Student',
    advisor: 'Advisor',
    hod: 'HOD',
    dean: 'Dean',
    super_admin: 'Super Admin'
};

export function PortalPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const roleLabel = ROLE_LABELS[user?.role] || user?.role;

    return (
        <div className="portal-page">
            <div className="portal-card">
                <h1>Welcome, {user?.name}</h1>
                <p>
                    You are signed in as <strong>{roleLabel}</strong>.
                </p>
                {user?.role === 'student' ? (
                    <p>
                        Continue to your student dashboard to view complaints
                        and manage your profile.
                    </p>
                ) : isAdminStaffRole(user?.role) ? (
                    <p>Open your complaint management dashboard.</p>
                ) : (
                    <p>
                        Use official channels if you need immediate assistance.
                    </p>
                )}
                <div className="portal-actions">
                    <Link to="/" className="btn btn--outline">
                        Back to homepage
                    </Link>
                    {user?.role === 'student' ? (
                        <Link to="/student/dashboard" className="btn btn--primary">
                            Student dashboard
                        </Link>
                    ) : null}
                    {isAdminStaffRole(user?.role) ? (
                        <Link
                            to={getStaffDashboardPath(user.role)}
                            className="btn btn--primary"
                        >
                            Staff dashboard
                        </Link>
                    ) : null}
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={async () => {
                            await logout();
                            navigate('/');
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
