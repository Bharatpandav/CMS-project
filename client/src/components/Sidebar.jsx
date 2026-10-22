import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
    IconBuilding,
    IconClipboard,
    IconDashboard,
    IconFileText,
    IconLayers,
    IconLogout,
    IconSettings,
    IconUpload,
    IconUserPlus,
    IconUsers
} from './icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getStaffBasePath } from '../utils/staffRoles.js';

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

function StudentNav({ onNavigate }) {
    return (
        <>
            <p className="sidebar__section">Main</p>
            <NavItem
                to="/student/dashboard"
                end
                icon={<IconDashboard />}
                label="Dashboard"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/student/complaints/register"
                icon={<IconUserPlus />}
                label="Register Complaint"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/student/complaints"
                icon={<IconFileText />}
                label="My Complaints"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/student/track"
                icon={<IconClipboard />}
                label="Track Status"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/app/profile"
                icon={<IconUsers />}
                label="My Profile"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/student/support"
                icon={<IconSettings />}
                label="Support / Help"
                onNavigate={onNavigate}
            />
        </>
    );
}

function StaffNav({ base, onNavigate, showSystemAdmin }) {
    return (
        <>
            <p className="sidebar__section">Main</p>
            <NavItem
                to={`${base}/dashboard`}
                end
                icon={<IconDashboard />}
                label="Dashboard"
                onNavigate={onNavigate}
            />
            <NavItem
                to={`${base}/complaints`}
                icon={<IconFileText />}
                label="Complaints"
                onNavigate={onNavigate}
            />
            <NavItem
                to={`${base}/categories`}
                icon={<IconLayers />}
                label="Categories"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/change-password"
                icon={<IconUsers />}
                label="Profile"
                onNavigate={onNavigate}
            />
            {showSystemAdmin ? (
                <>
                    <p className="sidebar__section">System</p>
                    <NavItem
                        to="/dashboard"
                        icon={<IconSettings />}
                        label="User Administration"
                        onNavigate={onNavigate}
                    />
                </>
            ) : null}
        </>
    );
}

function AdminNav({ onNavigate }) {
    return (
        <>
            <p className="sidebar__section">Main</p>
            <NavItem
                to="/dashboard"
                end
                icon={<IconDashboard />}
                label="Dashboard"
                onNavigate={onNavigate}
            />

            <p className="sidebar__section">User Management</p>
            <NavItem
                to="/users"
                icon={<IconUsers />}
                label="All Users"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/users/register"
                icon={<IconUserPlus />}
                label="Register User"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/users/bulk"
                icon={<IconUpload />}
                label="Bulk Registration"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/departments"
                icon={<IconBuilding />}
                label="Departments"
                onNavigate={onNavigate}
            />

            <p className="sidebar__section">Complaint Management</p>
            <NavItem
                to="/complaints"
                icon={<IconFileText />}
                label="All Complaints"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/complaints/categories"
                icon={<IconLayers />}
                label="Categories"
                onNavigate={onNavigate}
            />
            <NavItem
                to="/audit-logs"
                icon={<IconClipboard />}
                label="Audit Logs"
                onNavigate={onNavigate}
            />

            <p className="sidebar__section">System Management</p>
            <NavItem
                to="/settings"
                icon={<IconSettings />}
                label="Settings"
                onNavigate={onNavigate}
            />
        </>
    );
}

export function Sidebar({ mobileOpen, onClose }) {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isStudent = user?.role === 'student';
    const staffBase = getStaffBasePath(user?.role);
    const onVcPortal =
        user?.role === 'super_admin' &&
        location.pathname.startsWith('/vc');
    const useStaffNav =
        staffBase &&
        (user?.role !== 'super_admin' || onVcPortal);
    const showVcSystemAdmin =
        user?.role === 'super_admin' && onVcPortal;

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    const closeMobile = () => onClose?.();

    return (
        <>
            <div
                className={`sidebar-backdrop${mobileOpen ? ' is-open' : ''}`}
                onClick={onClose}
                aria-hidden="true"
            />
            <aside
                className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}
            >
                <div className="sidebar__brand">
                    <div className="sidebar__logo">SBSSU</div>
                    <div>
                        <p className="sidebar__brand-title">CMS Portal</p>
                        <p className="sidebar__brand-sub">
                            Complaint Management
                        </p>
                    </div>
                </div>

                <nav className="sidebar__nav">
                    {isStudent ? (
                        <StudentNav onNavigate={closeMobile} />
                    ) : useStaffNav ? (
                        <StaffNav
                            base={staffBase}
                            onNavigate={closeMobile}
                            showSystemAdmin={showVcSystemAdmin}
                        />
                    ) : (
                        <AdminNav onNavigate={closeMobile} />
                    )}
                </nav>

                <button
                    type="button"
                    className="sidebar__logout"
                    onClick={handleLogout}
                >
                    <IconLogout />
                    <span>Logout</span>
                </button>
            </aside>
        </>
    );
}
