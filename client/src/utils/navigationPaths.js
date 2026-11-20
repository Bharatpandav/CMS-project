import { getComplaintsListPathForManagement } from '../config/managementPortalNav.js';
import { canAccessManagementPortal } from './managementAccess.js';
import { getComplaintsListPath, UNIFIED_DASHBOARD_PATH } from './appPaths.js';
import { getStaffBasePath, isAdminStaffRole } from './staffRoles.js';

const MANAGEMENT_PORTAL_PREFIX = '/management';

/** Public entry paths — after login, prefer the role dashboard instead. */
const POST_LOGIN_IGNORE_PATHS = new Set(['/', '/reset-password']);

/**
 * Reject external / protocol-relative URLs (open redirect).
 */
export function isSafeInternalPath(path) {
    if (!path || typeof path !== 'string') return false;
    if (!path.startsWith('/') || path.startsWith('//')) return false;
    if (path.includes('://')) return false;
    return true;
}

export function resolveComplaintsListPath(role, pathname = '') {
    const path = (pathname || '').split('?')[0];
    if (path.startsWith('/management')) {
        return getComplaintsListPathForManagement();
    }
    return getComplaintsListPath(role);
}

export function getRoleDashboardPath(user) {
    if (!user) return '/';
    if (user.isFirstLogin) return '/change-password';
    const role = (user.role || '').trim().toLowerCase();
    if (role === 'hod') return '/hod/dashboard';
    if (role === 'dean') return '/dean/dashboard';
    if (role === 'advisor') return '/advisor/dashboard';
    if (role === 'super_admin') return '/vc/dashboard';
    if (role === 'student') return '/student/dashboard';
    return UNIFIED_DASHBOARD_PATH;
}

/**
 * Whether the authenticated user may open this in-app path (frontend guard).
 */
export function canUserAccessPath(user, pathname) {
    if (!user?.role || !isSafeInternalPath(pathname)) return false;

    const path = pathname.split('?')[0];

    if (path === '/' || path === '/change-password') return true;

    if (
        path.startsWith(MANAGEMENT_PORTAL_PREFIX) ||
        path.startsWith('/users')
    ) {
        return canAccessManagementPortal(user.role);
    }

    if (path.startsWith('/student/')) {
        return user.role === 'student';
    }

    const staffBase = getStaffBasePath(user.role);
    if (staffBase && path.startsWith(staffBase)) {
        return isAdminStaffRole(user.role);
    }

    if (path.startsWith('/management/departments') || path === '/departments') {
        return ['dean', 'hod', 'advisor'].includes(user.role);
    }

    if (
        path.startsWith('/complaints') ||
        path.startsWith('/audit-logs') ||
        path.startsWith('/settings')
    ) {
        return user.role === 'super_admin';
    }

    if (path === UNIFIED_DASHBOARD_PATH || path.startsWith('/app/')) {
        return user.role !== undefined;
    }

    return false;
}

/**
 * After login: return to requested page if safe and authorized.
 */
export function resolvePostLoginPath(
    user,
    fromLocation,
    { dashboardFallback } = {}
) {
    const fallback = dashboardFallback ?? getRoleDashboardPath(user);
    const pathname = fromLocation?.pathname;

    if (!pathname || POST_LOGIN_IGNORE_PATHS.has(pathname)) {
        return fallback;
    }

    const target = pathname + (fromLocation.search || '');

    if (!isSafeInternalPath(target)) return fallback;
    if (!canUserAccessPath(user, pathname)) return fallback;

    return target;
}

export function buildListReturnState(fromPathname, fromSearch = '', extra = {}) {
    return {
        from: fromPathname + fromSearch,
        ...extra
    };
}

const LIST_STATE_PREFIX = 'cms:list-state:';

export function saveListUiState(listKey, state) {
    if (!listKey) return;
    try {
        sessionStorage.setItem(
            LIST_STATE_PREFIX + listKey,
            JSON.stringify(state)
        );
    } catch {
        /* ignore quota */
    }
}

export function readListUiState(listKey) {
    if (!listKey) return null;
    try {
        const raw = sessionStorage.getItem(LIST_STATE_PREFIX + listKey);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearListUiState(listKey) {
    if (!listKey) return;
    try {
        sessionStorage.removeItem(LIST_STATE_PREFIX + listKey);
    } catch {
        /* ignore */
    }
}
