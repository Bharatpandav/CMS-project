import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    IconBell,
    IconChevronDown,
    IconMenu,
    IconSearch
} from './icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_LABELS = {
    super_admin: 'Super Admin',
    dean: 'Dean',
    hod: 'HOD',
    advisor: 'Advisor',
    student: 'Student'
};

export function TopNav({ onMenuClick, search, onSearchChange }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClick(e) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target)
            ) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const displayName = user?.name || 'Administrator';
    const roleLabel =
        ROLE_LABELS[user?.role] || user?.role || 'User';

    return (
        <header className="topnav">
            <button
                type="button"
                className="topnav__menu-btn"
                aria-label="Open navigation"
                onClick={onMenuClick}
            >
                <IconMenu />
            </button>

            <div className="topnav__search">
                <IconSearch />
                <input
                    type="search"
                    placeholder="Search users, complaints, departments..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    aria-label="Global search"
                />
            </div>

            <div className="topnav__actions">
                <button
                    type="button"
                    className="topnav__icon-btn"
                    aria-label="Notifications"
                    disabled
                    title="Notifications are not available yet"
                >
                    <IconBell />
                </button>

                <div className="topnav__profile" ref={dropdownRef}>
                    <button
                        type="button"
                        className="topnav__profile-btn"
                        onClick={() => setDropdownOpen((v) => !v)}
                    >
                        <span className="topnav__avatar">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                        <span className="topnav__profile-text">
                            <span className="topnav__name">
                                {displayName}
                            </span>
                            <span className="topnav__role">{roleLabel}</span>
                        </span>
                        <IconChevronDown />
                    </button>
                    {dropdownOpen ? (
                        <div className="topnav__dropdown">
                            <Link
                                to={
                                    user?.role === 'student'
                                        ? '/student/profile'
                                        : '/change-password'
                                }
                                onClick={() => setDropdownOpen(false)}
                            >
                                {user?.role === 'student'
                                    ? 'My profile'
                                    : 'Profile / password'}
                            </Link>
                            <button
                                type="button"
                                onClick={async () => {
                                    setDropdownOpen(false);
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
