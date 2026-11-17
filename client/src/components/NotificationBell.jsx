import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { authApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { getComplaintDetailPath } from '../utils/appPaths.js';
import { useNotificationStream } from '../hooks/useNotificationStream.js';
import { complaintPublicId } from '../utils/complaintPublicId.js';

function complaintIdOf(value) {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || '');
    return String(value);
}

function formatNotificationWhen(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit'
    });
}

function notificationComplaintLabel(notification) {
    const related = notification?.relatedComplaint;
    if (!related) return '';
    if (typeof related === 'object') {
        return (
            complaintPublicId(related) ||
            (related._id ? String(related._id) : '')
        );
    }
    return String(related);
}

export function NotificationBell({
    onRequestLogin,
    className = 'public-header__icon-btn',
    badgeClassName = 'public-header__badge'
}) {
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [clearing, setClearing] = useState(false);
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

    useNotificationStream(
        () => loadNotifications({ quiet: true }),
        isAuthenticated
    );

    useEffect(() => {
        if (!isAuthenticated) {
            setNotifications([]);
            setUnreadCount(0);
            setOpen(false);
            return undefined;
        }
        loadNotifications({ quiet: true });
        return undefined;
    }, [isAuthenticated, loadNotifications]);

    useEffect(() => {
        if (!open || !isAuthenticated) return undefined;
        loadNotifications();
        return undefined;
    }, [open, isAuthenticated, loadNotifications]);

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

    const complaintPathFor = (complaintId) => {
        if (!complaintId) return null;
        return location.pathname.startsWith('/management')
            ? `/management/complaints/${complaintId}`
            : getComplaintDetailPath(user?.role, complaintId);
    };

    const openNotification = async (notification) => {
        const complaintId = complaintIdOf(notification.relatedComplaint);
        const wasUnread = !notification.read;
        const path = complaintPathFor(complaintId);

        setOpen(false);

        if (wasUnread) {
            setNotifications((current) =>
                current.map((item) =>
                    item._id === notification._id
                        ? { ...item, read: true }
                        : item
                )
            );
            setUnreadCount((count) => Math.max(0, count - 1));
            try {
                const data = await authApi.markNotificationRead(notification._id);
                if (typeof data.unreadCount === 'number') {
                    setUnreadCount(data.unreadCount);
                }
            } catch {
                loadNotifications({ quiet: true });
            }
        }

        if (!path) return;
        navigate(path);
    };

    const handleClearAll = async () => {
        if (clearing) return;
        const confirmed = window.confirm(
            'Clear all notifications? This removes your entire notification history.'
        );
        if (!confirmed) return;

        setClearing(true);
        setError('');
        try {
            const data = await authApi.clearAllNotifications();
            setNotifications([]);
            setUnreadCount(data.unreadCount ?? 0);
        } catch (err) {
            setError(err.message || 'Failed to clear notifications');
        } finally {
            setClearing(false);
        }
    };

    const badgeValue =
        unreadCount > 99 ? '99+' : String(unreadCount);

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
                    <span className={badgeClassName} aria-hidden>
                        {badgeValue}
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
                        {notifications.length > 0 ? (
                            <button
                                type="button"
                                className="public-notifications__clear"
                                onClick={handleClearAll}
                                disabled={clearing}
                            >
                                {clearing ? 'Clearing…' : 'Clear all'}
                            </button>
                        ) : null}
                    </header>
                    {loading ? (
                        <p className="public-notifications__empty">Loading…</p>
                    ) : error ? (
                        <p className="public-notifications__empty public-notifications__empty--error">
                            {error}
                        </p>
                    ) : notifications.length === 0 ? (
                        <p className="public-notifications__empty">
                            You&apos;re all caught up. New complaint updates will
                            appear here.
                        </p>
                    ) : (
                        <ul className="public-notifications__list">
                            {notifications.map((notification) => {
                                const complaintId = complaintIdOf(
                                    notification.relatedComplaint
                                );
                                const complaintLabel =
                                    notificationComplaintLabel(notification);
                                return (
                                    <li key={notification._id}>
                                        <button
                                            type="button"
                                            className={
                                                notification.read
                                                    ? 'public-notifications__item'
                                                    : 'public-notifications__item public-notifications__item--unread'
                                            }
                                            onClick={() =>
                                                openNotification(notification)
                                            }
                                        >
                                            <span className="public-notifications__title">
                                                {notification.title}
                                            </span>
                                            <span className="public-notifications__msg">
                                                {notification.message}
                                            </span>
                                            <span className="public-notifications__meta">
                                                {complaintLabel ? (
                                                    <span>
                                                        ID {complaintLabel}
                                                    </span>
                                                ) : null}
                                                <span>
                                                    {formatNotificationWhen(
                                                        notification.createdAt
                                                    )}
                                                </span>
                                                {!notification.read ? (
                                                    <em className="public-notifications__pill">
                                                        Unread
                                                    </em>
                                                ) : null}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            ) : null}
        </div>
    );
}