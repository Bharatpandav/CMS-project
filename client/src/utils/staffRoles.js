export const ADMIN_STAFF_ROLES = [
    'advisor',
    'hod',
    'dean',
    'super_admin'
];

export function isAdminStaffRole(role) {
    return ADMIN_STAFF_ROLES.includes(role);
}

export function getStaffBasePath(role) {
    switch (role) {
        case 'advisor':
            return '/advisor';
        case 'hod':
            return '/hod';
        case 'dean':
            return '/dean';
        case 'super_admin':
            return '/vc';
        default:
            return null;
    }
}

export function getStaffDashboardPath(role) {
    const base = getStaffBasePath(role);
    if (!base) {
        return '/portal';
    }
    return `${base}/dashboard`;
}

export function getStaffRoleLabel(role) {
    const labels = {
        advisor: 'Advisor',
        hod: 'HOD',
        dean: 'Dean',
        super_admin: 'Vice Chancellor'
    };
    return labels[role] || role;
}

export function roleMatchesPath(role, pathname) {
    const base = getStaffBasePath(role);
    if (!base) {
        return false;
    }
    return pathname === base || pathname.startsWith(`${base}/`);
}
