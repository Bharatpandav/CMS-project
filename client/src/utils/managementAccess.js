export const MANAGEMENT_PORTAL_ROLES = [
    'super_admin',
    'dean',
    'hod',
    'advisor'
];

export function canAccessManagementPortal(role) {
    return MANAGEMENT_PORTAL_ROLES.includes(role);
}

export const MANAGEMENT_BULK_ROLES = MANAGEMENT_PORTAL_ROLES;

const PORTAL_MANAGEMENT_ITEMS = [
    { to: '/management/users', label: 'All Users' },
    { to: '/management/register', label: 'Register User' },
    { to: '/management/bulk', label: 'Bulk Import' }
];

export function getPortalManagementNavItems() {
    return PORTAL_MANAGEMENT_ITEMS;
}

export function getManagementDashboardPath(role) {
    if (role === 'hod') return '/hod/dashboard';
    if (role === 'dean') return '/dean/dashboard';
    if (role === 'advisor') return '/advisor/dashboard';
    if (role === 'super_admin') return '/vc/dashboard';
    return '/app/dashboard';
}

export function getManagementPostLoginPath(user) {
    if (!user) return '/';
    if (user.isFirstLogin) return '/change-password';
    if (user.role === 'hod') return '/hod/dashboard';
    if (user.role === 'dean') return '/dean/dashboard';
    if (user.role === 'advisor') return '/advisor/dashboard';
    if (user.role === 'super_admin') return '/vc/dashboard';
    return '/app/dashboard';
}
