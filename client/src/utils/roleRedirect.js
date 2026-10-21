import { getStaffDashboardPath, isAdminStaffRole } from './staffRoles.js';

export function getPostLoginPath(user) {
    if (!user) {
        return '/';
    }

    if (user.isFirstLogin) {
        return '/change-password';
    }

    if (user.role === 'super_admin') {
        return '/vc/dashboard';
    }

    if (user.role === 'student') {
        return '/student/dashboard';
    }

    if (isAdminStaffRole(user.role)) {
        return getStaffDashboardPath(user.role);
    }

    return '/portal';
}

export function getAdminLoginPath(user) {
    if (!user) {
        return '/admin/login';
    }
    if (user.isFirstLogin) {
        return '/change-password';
    }
    if (isAdminStaffRole(user.role)) {
        return getStaffDashboardPath(user.role);
    }
    return null;
}
