import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getComplaintDetailPath } from '../utils/appPaths.js';

const POLL_MS = 12000;

function complaintIdOf(value) {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || '');
    return String(value);
}

export function NotificationBell({ onRequestLogin, className = 'public-header__icon-btn' }) {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const panelRef = useRef(null);

    const loadNotifications = useCallback(async ({ quiet = false } = {}) => {
        if (!isAuthenticated) return;
        if (!quiet) setLoading(true);
        setError('');
        try {
            const data = await authApi.listNotifications();
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount ?? 0);
        } catch (err) {
            if (!quiet) setError(err.message || 'Failed to load notifications');
        } finally {
            if (!quiet) setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            setOpen(false);
            return undefined;
        }
        loadNotifications();
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                loadNotifications({ quiet: true });
            }
        }, POLL_MS);
        const onFocus = () => loadNotifications({ quiet: true });
        window.addEventListener('focus', onFocus);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('focus', onFocus);
        };
    }, [isAuthenticated, loadNotifications]);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const handleBell = () => {
        if (!isAuthenticated) {
            onRequestLogin?.();
            return;
        }
        setOpen((value) => !value);
    };

    const openNotification = async (notification) => {
        const complaintId = complaintIdOf(notification.relatedComplaint);
        setNotifications((current) =>
            current.filter((item) => item._id !== notification._id)
        );
        setUnreadCount((count) => Math.max(0, count - 1));
        setOpen(false);
        try {
            await authApi.dismissNotification(notification._id);
        } catch {
            loadNotifications({ quiet: true });
        }
        if (!complaintId) return;
        const path = location.pathname.startsWith('/management')
            ? `/management/complaints/${complaintId}`
            : getComplaintDetailPath(user?.role, complaintId);
        navigate(path);
    };

    return (
        <div className="notification-bell" ref={panelRef}>
            <button
                type="button"
                className={className}
                aria-label={
                    unreadCount
                        ? `Notifications, ${unreadCount} unread`
                        : 'Notifications'
                }
                aria-expanded={open}
                onClick={handleBell}
            >
                <Bell size={20} strokeWidth={1.75} aria-hidden />
                {isAuthenticated && unreadCount > 0 ? (
                    <span className="public-header__badge" aria-hidden>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                ) : null}
            </button>

            {open && isAuthenticated ? (
                <div
                    className="public-notifications"
                    role="region"
                    aria-label="Notifications"
                >
                    <header className="public-notifications__head">
                        <strong>Notifications</strong>
                    </header>
                    {loading ? (
                        <p className="public-notifications__empty">Loading…</p>
                    ) : error ? (
                        <p className="public-notifications__empty">{error}</p>
                    ) : notifications.length === 0 ? (
                        <p className="public-notifications__empty">
                            No notifications yet.
                        </p>
                    ) : (
                        <ul className="public-notifications__list">
                            {notifications.map((notification) => (
                                <li key={notification._id}>
                                    <button
                                        type="button"
                                        className="public-notifications__item public-notifications__item--unread"
                                        onClick={() => openNotification(notification)}
                                    >
                                        <span className="public-notifications__title">
                                            {notification.title}
                                        </span>
                                        <span className="public-notifications__msg">
                                            {notification.message}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}
