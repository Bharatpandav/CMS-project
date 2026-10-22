import { canAccessManagementPortal } from './managementAccess.js';
import { getStaffBasePath } from './staffRoles.js';

export const UNIFIED_DASHBOARD_PATH = '/app/dashboard';
export const UNIFIED_PROFILE_PATH = '/app/profile';
export const MANAGEMENT_PROFILE_PATH = '/management/profile';

export function getPostLoginDestination(user) {
    if (!user) return '/';
    if (user.isFirstLogin) return '/change-password';
    return UNIFIED_DASHBOARD_PATH;
}

export function getComplaintsListPath(role) {
    if (role === 'student') return '/student/complaints';
    const base = getStaffBasePath(role);
    if (base) return `${base}/complaints`;
    if (role === 'super_admin') return '/complaints';
    return '/student/complaints';
}

export function getComplaintDetailPath(role, id) {
    return `${getComplaintsListPath(role)}/${id}`;
}

export function getRegisterComplaintPath(role) {
    if (role === 'student') return '/student/complaints/register';
    return null;
}

export function getProfilePath(role, pathname = '') {
    if (pathname.startsWith('/management')) {
        return MANAGEMENT_PROFILE_PATH;
    }
    if (role === 'student' || role) {
        return UNIFIED_PROFILE_PATH;
    }
    return '/change-password';
}

export function getManagementHomePath(role) {
    return canAccessManagementPortal(role)
        ? '/management/users'
        : null;
}
