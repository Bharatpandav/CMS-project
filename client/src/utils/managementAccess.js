export const MANAGEMENT_PORTAL_ROLES = [
    'super_admin',
    'dean',
    'hod',
    'advisor'
];

export function canAccessManagementPortal(role) {
    return MANAGEMENT_PORTAL_ROLES.includes(role);
}

export function getManagementDashboardPath() {
    return '/management/dashboard';
}

export function getManagementPostLoginPath(user) {
    if (!user) return '/';
    if (user.isFirstLogin) return '/change-password';
    if (canAccessManagementPortal(user.role)) {
        return getManagementDashboardPath();
    }
    return '/app/dashboard';
}
