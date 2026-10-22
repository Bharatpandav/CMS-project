import { CREATABLE_ROLES_BY_ACTOR } from '../utils/allowedRoles.js';
import { getStaffBasePath } from '../utils/staffRoles.js';

export function getManagementRoleLabel(role) {
    const labels = {
        super_admin: 'Super Admin',
        dean: 'Dean',
        hod: 'HOD',
        advisor: 'Advisor'
    };
    return labels[role] || role;
}

export function canManageUsers(role) {
    return (CREATABLE_ROLES_BY_ACTOR[role] || []).length > 0;
}

export function getComplaintsListPathForManagement() {
    return '/management/complaints';
}

export function getCategoriesPathForManagement() {
    return '/management/categories';
}

export function getManagementNavSections(user) {
    const role = user?.role;
    const sections = [
        {
            title: null,
            items: [
                { to: '/management/dashboard', label: 'Dashboard', end: true }
            ]
        }
    ];

    if (canManageUsers(role)) {
        sections.push({
            title: 'User Management',
            items: [
                { to: '/management/users', label: 'All Users' },
                { to: '/management/register', label: 'Register User' },
                { to: '/management/bulk', label: 'Bulk Registration' },
                { to: '/management/departments', label: 'Departments' }
            ]
        });
    }

    const complaintItems = [
        {
            to: getComplaintsListPathForManagement(),
            label: 'All Complaints'
        }
    ];
    if (role === 'super_admin' || getStaffBasePath(role)) {
        complaintItems.push({
            to: getCategoriesPathForManagement(),
            label: 'Categories'
        });
    }
    if (role === 'super_admin') {
        complaintItems.push({
            to: '/management/audit-logs',
            label: 'Audit Logs'
        });
    }

    sections.push({
        title: 'Complaint Management',
        items: complaintItems
    });

    if (role === 'super_admin') {
        sections.push({
            title: 'System Management',
            items: [{ to: '/management/settings', label: 'Settings' }]
        });
    }

    sections.push({
        title: 'Account',
        items: [{ to: '/management/profile', label: 'My Profile' }]
    });

    return sections;
}

export function getManagementQuickActions(user) {
    const role = user?.role;
    const actions = [];

    if (canManageUsers(role)) {
        actions.push({
            key: 'register',
            title: 'Register User',
            subtitle: 'Add a new user',
            to: '/management/register',
            tone: 'teal'
        });
        actions.push({
            key: 'bulk',
            title: 'Bulk Registration',
            subtitle: 'Upload users via CSV',
            to: '/management/bulk',
            tone: 'orange'
        });
    }

    const catPath = getCategoriesPathForManagement();
    if (catPath) {
        actions.push({
            key: 'categories',
            title: 'Manage Categories',
            subtitle: 'Add or edit categories',
            to: catPath,
            tone: 'blue'
        });
    }

    actions.push({
        key: 'complaints',
        title: 'View All Complaints',
        subtitle: 'Check and manage',
        to: getComplaintsListPathForManagement(),
        tone: 'purple'
    });

    return actions.slice(0, 4);
}
