import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconMenu } from './icons.jsx';
import { NotificationBell } from './NotificationBell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { UNIFIED_DASHBOARD_PATH, getProfilePath } from '../utils/appPaths.js';
import { getStaffRoleLabel } from '../utils/staffRoles.js';

const ROLE_LABELS = {
    super_admin: 'Vice Chancellor',
    dean: 'Dean',
    hod: 'HOD',
    advisor: 'Advisor',
    student: 'Student'
};

export function PortalHeader({ onMenuClick, menuOpen = false }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const onDoc = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const name = user?.name || 'User';
    const roleLabel =
        ROLE_LABELS[user?.role] ||
        getStaffRoleLabel(user?.role) ||
        user?.role;

    return (
        <header className="portal-header">
            <div className="portal-header__inner">
                <button
                    type="button"
                    className="portal-header__menu"
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    aria-expanded={menuOpen}
                    aria-controls="portal-mobile-drawer"
                    onClick={onMenuClick}
                >
                    <IconMenu />
                </button>

                <Link to={UNIFIED_DASHBOARD_PATH} className="public-brand">
                    <span className="public-brand__shield" aria-hidden="true">
                        SB
                    </span>
                    <span className="public-brand__text public-brand__text--full">
                        University Complaint Management System
                    </span>
                    <span className="public-brand__text public-brand__text--short">
                        UCMS
                    </span>
                </Link>

                <div className="portal-header__actions">
                    <NotificationBell className="public-header__icon-btn" />

                    <div className="portal-profile" ref={menuRef}>
                        <button
                            type="button"
                            className="portal-profile__btn"
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                        >
                            <span className="portal-profile__avatar">
                                {name.charAt(0).toUpperCase()}
                            </span>
                            <span className="portal-profile__meta">
                                <span className="portal-profile__name">
                                    {name}
                                </span>
                                <span className="portal-profile__role">
                                    {roleLabel}
                                </span>
                            </span>
                        </button>
                        {open ? (
                            <div className="portal-profile__menu">
                                <Link
                                    to={getProfilePath(
                                        user?.role,
                                        location.pathname
                                    )}
                                    onClick={() => setOpen(false)}
                                >
                                    Profile &amp; password
                                </Link>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setOpen(false);
                                        await logout();
                                        navigate('/');
                                    }}
                                >
                                    Logout
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </header>
    );
}
