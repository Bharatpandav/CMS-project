import { NavLink, useNavigate } from 'react-router-dom';
import {
    IconClipboard,
    IconDashboard,
    IconFileText,
    IconLayers,
    IconLogout,
    IconSettings,
    IconUpload,
    IconUserPlus,
    IconUsers
} from '../icons.jsx';
import { AppIcon } from '../AppIcon.jsx';
import { getManagementNavSections } from '../../config/managementPortalNav.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { getNavIconKey } from '../../utils/navIcons.js';

const ICONS = {
    Dashboard: <IconDashboard />,
    'All Users': <IconUsers />,
    'Register User': <IconUserPlus />,
    'Bulk Registration': <IconUpload />,
    Departments: <IconUsers />,
    'All Complaints': <IconFileText />,
    Categories: <IconLayers />,
    'Audit Logs': <IconClipboard />,
    Settings: <IconSettings />
};

function NavItem({ to, label, end, onNavigate }) {
    const iconKey = getNavIconKey(label);
    const legacyIcon = ICONS[label];
    return (
        <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
                `mgmt-nav-link${isActive ? ' mgmt-nav-link--active' : ''}`
            }
        >
            <span className="portal-nav-link__icon" aria-hidden="true">
                {legacyIcon || <AppIcon name={iconKey} size="md" />}
            </span>
            <span>{label}</span>
        </NavLink>
    );
}

export function ManagementPortalSidebar({
    variant = 'desktop',
    mobileOpen,
    onClose
}) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const sections = getManagementNavSections(user);
    const closeMobile = () => onClose?.();

    const handleLogout = async () => {
        closeMobile();
        await logout();
        navigate('/', { replace: true });
    };

    const isMobile = variant === 'mobile';
    const className = isMobile
        ? `mgmt-sidebar mgmt-sidebar--drawer${mobileOpen ? ' is-open' : ''}`
        : 'mgmt-sidebar mgmt-sidebar--desktop';

    return (
        <aside
            id={isMobile ? 'mgmt-mobile-drawer' : undefined}
            className={className}
            aria-label="Management navigation"
            aria-hidden={isMobile ? !mobileOpen : undefined}
            {...(isMobile && !mobileOpen ? { inert: true } : {})}
        >
            <div className="mgmt-sidebar__brand">
                <div className="mgmt-sidebar__logo" aria-hidden="true">SB</div>
                <div className="mgmt-sidebar__brand-text">
                    <strong>University</strong>
                    <span>Complaint Management System</span>
                </div>
            </div>
            <nav className="mgmt-sidebar__nav">
                {sections.map((section) => (
                    <div key={section.title || 'main'}>
                        {section.title ? (
                            <p className="mgmt-sidebar__section">
                                {section.title}
                            </p>
                        ) : null}
                        {section.items.map((item) => (
                            <NavItem
                                key={item.to + item.label}
                                to={item.to}
                                label={item.label}
                                end={item.end}
                                onNavigate={closeMobile}
                            />
                        ))}
                    </div>
                ))}
            </nav>
            <div className="mgmt-sidebar__footer">
                <button
                    type="button"
                    className="mgmt-sidebar__logout"
                    onClick={handleLogout}
                >
                    <IconLogout />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
