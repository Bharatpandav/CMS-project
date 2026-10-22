import { getComplaintsListPathForManagement } from '../config/managementPortalNav.js';
import { canAccessManagementPortal } from './managementAccess.js';
import { getComplaintsListPath, UNIFIED_DASHBOARD_PATH } from './appPaths.js';
import { getStaffBasePath, isAdminStaffRole } from './staffRoles.js';

const MANAGEMENT_PORTAL_PREFIX = '/management';

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
    if (canAccessManagementPortal(user.role)) {
        return '/management/dashboard';
    }
    return UNIFIED_DASHBOARD_PATH;
}

/**
 * Whether the authenticated user may open this in-app path (frontend guard).
 */
export function canUserAccessPath(user, pathname) {
    if (!user?.role || !isSafeInternalPath(pathname)) return false;

    const path = pathname.split('?')[0];

    if (path === '/' || path === '/change-password') return true;

    if (path.startsWith(MANAGEMENT_PORTAL_PREFIX)) {
        return canAccessManagementPortal(user.role);
    }

    if (path.startsWith('/student/')) {
        return user.role === 'student';
    }

    const staffBase = getStaffBasePath(user.role);
    if (staffBase && path.startsWith(staffBase)) {
        return isAdminStaffRole(user.role);
    }

    if (
        path.startsWith('/complaints') ||
        path.startsWith('/users') ||
        path.startsWith('/departments') ||
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
    if (!fromLocation?.pathname) return fallback;

    const target =
        fromLocation.pathname + (fromLocation.search || '');

    if (!isSafeInternalPath(target)) return fallback;
    if (!canUserAccessPath(user, fromLocation.pathname)) return fallback;

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
