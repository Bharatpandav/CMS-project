import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconBell, IconMenu, IconSearch } from '../icons.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getManagementRoleLabel } from '../../config/managementPortalNav.js';

export function ManagementPortalHeader({
    onMenuClick,
    onSearch,
    menuOpen = false
}) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const name = user?.name || 'User';
    const roleLabel = getManagementRoleLabel(user?.role);

    const submitSearch = (e) => {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        if (onSearch) {
            onSearch(q);
        } else {
            navigate(
                `/management/users?search=${encodeURIComponent(q)}`
            );
        }
    };

    return (
        <header className="mgmt-header">
            <button
                type="button"
                className="mgmt-header__menu"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mgmt-mobile-drawer"
                onClick={onMenuClick}
            >
                <IconMenu />
            </button>

            <form className="mgmt-header__search" onSubmit={submitSearch}>
                <IconSearch />
                <input
                    type="search"
                    placeholder="Search users, complaints, departments..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search"
                />
            </form>

            <div className="mgmt-header__actions">
                <button
                    type="button"
                    className="mgmt-header__bell"
                    aria-label="Notifications unavailable"
                    title="Notifications are not implemented"
                    disabled
                >
                    <IconBell />
                </button>

                <div className="mgmt-profile" ref={menuRef}>
                    <button
                        type="button"
                        className="mgmt-profile__btn"
                        onClick={() => setOpen((v) => !v)}
                        aria-expanded={open}
                    >
                        <span className="mgmt-profile__avatar">
                            {name.charAt(0).toUpperCase()}
                        </span>
                        <span className="mgmt-profile__text">
                            <span className="mgmt-profile__name">{name}</span>
                            <span className="mgmt-profile__role">
                                {roleLabel}
                            </span>
                        </span>
                    </button>
                    {open ? (
                        <div className="mgmt-profile__menu">
                            <Link
                                to="/management/profile"
                                onClick={() => setOpen(false)}
                            >
                                My Profile
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
        </header>
    );
}
