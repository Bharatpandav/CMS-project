import { NavLink, useNavigate } from 'react-router-dom';
import {
    IconBuilding,
    IconClipboard,
    IconDashboard,
    IconLogout,
    IconUpload,
    IconUserPlus,
    IconUsers
} from './icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function NavItem({ to, icon, label, end, onNavigate }) {
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
            }
        >
            <span className="sidebar__link-icon">{icon}</span>
            <span>{label}</span>
        </NavLink>
    );
}

export function ManagementSidebar({ mobileOpen, onClose }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const isSuperAdmin = user?.role === 'super_admin';

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const closeMobile = () => onClose?.();

    return (
        <>
            <div
                className={`sidebar-backdrop${mobileOpen ? ' is-open' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
                <div className="sidebar__brand">
                    <div className="sidebar__logo">MGMT</div>
                    <div>
                        <p className="sidebar__brand-title">Management Portal</p>
                        <p className="sidebar__brand-sub">User administration</p>
                    </div>
                </div>
                <nav className="sidebar__nav">
                    <p className="sidebar__section">Management</p>
                    <NavItem to="/management/dashboard" end icon={<IconDashboard />} label="Management Dashboard" onNavigate={closeMobile} />
                    <NavItem to="/management/users" icon={<IconUsers />} label="All Users" onNavigate={closeMobile} />
                    <NavItem to="/management/register" icon={<IconUserPlus />} label="Register User" onNavigate={closeMobile} />
                    <NavItem to="/management/bulk" icon={<IconUpload />} label="Bulk Registration" onNavigate={closeMobile} />
                    <NavItem to="/management/users?role=student" icon={<IconUsers />} label="Students" onNavigate={closeMobile} />
                    <NavItem to="/management/users?role=staff" icon={<IconUsers />} label="Administrators & Staff" onNavigate={closeMobile} />
                    <NavItem to="/management/departments" icon={<IconBuilding />} label="Departments" onNavigate={closeMobile} />
                    {isSuperAdmin ? (
                        <NavItem to="/management/roles" icon={<IconClipboard />} label="Roles & Permissions" onNavigate={closeMobile} />
                    ) : null}
                    <NavItem to="/management/import-export" icon={<IconUpload />} label="Import / Export" onNavigate={closeMobile} />
                </nav>
                <button type="button" className="sidebar__logout" onClick={handleLogout}>
                    <IconLogout />
                    <span>Logout</span>
                </button>
            </aside>
        </>
    );
}
