import { NavLink, useLocation } from 'react-router-dom';
import { AppIcon } from './AppIcon.jsx';
import { getPortalNavSections } from '../config/roleNavigation.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLogoutToHome } from '../hooks/useLogoutToHome.js';
import { getNavIconKey } from '../utils/navIcons.js';

function isPortalItemActive(pathname, to) {
    if (pathname === to) return true;

    if (to === '/student/dashboard') {
        return pathname === '/student/dashboard';
    }

    if (to === '/hod/dashboard') {
        return pathname === '/hod/dashboard';
    }

    if (to === '/dean/dashboard') {
        return pathname === '/dean/dashboard';
    }

    if (to === '/vc/dashboard') {
        return pathname === '/vc/dashboard';
    }

    if (to === '/app/dashboard') {
        return (
            pathname === '/app/dashboard' ||
            pathname === '/advisor/dashboard' ||
            pathname === '/dean/dashboard' ||
            pathname === '/student/dashboard' ||
            pathname === '/dashboard' ||
            pathname === '/portal'
        );
    }

    if (to === '/app/profile') {
        return (
            pathname === '/app/profile' ||
            pathname === '/management/profile' ||
            pathname === '/student/profile'
        );
    }

    if (to === '/student/complaints/register') {
        return pathname === '/student/complaints/register';
    }
    if (to === '/student/complaints') {
        if (pathname === '/student/complaints') return true;
        return /^\/student\/complaints\/(?!register(?:\/|$))[^/]+/.test(
            pathname
        );
    }
    if (to === '/student/all-complaints') {
        return pathname === '/student/all-complaints';
    }
    if (to === '/complaints') {
        if (pathname === '/complaints') return true;
        return /^\/complaints\/(?!categories(?:\/|$))[^/]+/.test(pathname);
    }

    if (to === '/management/users') {
        if (pathname === '/management/users' || pathname === '/users') return true;
        if (
            pathname.startsWith('/users/') &&
            pathname !== '/users/register' &&
            pathname !== '/users/bulk'
        ) {
            return true;
        }
        return false;
    }

    if (to === '/management/register') {
        return (
            pathname === '/management/register' ||
            pathname === '/users/register'
        );
    }

    if (to === '/management/bulk') {
        return (
            pathname === '/management/bulk' ||
            pathname === '/users/bulk'
        );
    }

    if (to === '/management/departments') {
        return (
            pathname === '/management/departments' ||
            pathname === '/departments'
        );
    }

    return pathname.startsWith(`${to}/`);
}

function NavLinkItem({ to, label, onNavigate }) {
    const iconKey = getNavIconKey(label);
    const { pathname } = useLocation();
    const active = isPortalItemActive(pathname, to);
    return (
        <NavLink
            to={to}
            end
            onClick={onNavigate}
            className={() =>
                `portal-nav-link${active ? ' portal-nav-link--active' : ''}`
            }
            aria-current={active ? 'page' : undefined}
        >
            <span className="portal-nav-link__icon" aria-hidden="true">
                <AppIcon name={iconKey} size="md" />
            </span>
            <span className="portal-nav-link__label">{label}</span>
        </NavLink>
    );
}

export function PortalSidebar({ variant = 'desktop', mobileOpen, onClose }) {
    const { user } = useAuth();
    const logoutToHome = useLogoutToHome();
    const sections = getPortalNavSections(user);
    const closeMobile = () => onClose?.();

    const handleLogout = async () => {
        closeMobile();
        await logoutToHome();
    };

    const isMobile = variant === 'mobile';
    const className = isMobile
        ? `portal-sidebar portal-sidebar--mobile${mobileOpen ? ' is-open' : ''}`
        : 'portal-sidebar portal-sidebar--desktop';

    const navContent = (
        <>
            <nav className="portal-sidebar__nav" aria-label="Portal sections">
                {sections.map((section) => (
                    <div key={section.title} className="portal-nav-section">
                        <p className="portal-nav-section__title">
                            {section.title}
                        </p>
                        {section.items.map((item) => (
                            <NavLinkItem
                                key={item.to + item.label}
                                to={item.to}
                                label={item.label}
                                onNavigate={closeMobile}
                            />
                        ))}
                    </div>
                ))}
            </nav>
            <div className="portal-sidebar__footer">
                <button
                    type="button"
                    className="portal-sidebar__logout cms-btn-reflect"
                    onClick={handleLogout}
                >
                    <AppIcon name="logout" size="sm" />
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <aside
            id={isMobile ? 'portal-mobile-drawer' : undefined}
            className={className}
            aria-label="Portal navigation"
            aria-hidden={isMobile ? !mobileOpen : undefined}
            {...(isMobile && !mobileOpen ? { inert: true } : {})}
        >
            {isMobile ? (
                <div className="portal-sidebar__inner">{navContent}</div>
            ) : (
                navContent
            )}
        </aside>
    );
}
