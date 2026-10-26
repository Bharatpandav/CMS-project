import { canAccessManagementPortal } from '../utils/managementAccess.js';
import { UNIFIED_DASHBOARD_PATH } from '../utils/appPaths.js';
import { getStaffBasePath, isAdminStaffRole } from '../utils/staffRoles.js';

/**
 * Primary navigation for the unified portal shell.
 */
export function getPortalNavSections(user) {
    const role = user?.role;
    if (!role) return [];

    if (role === 'student') {
        return [
            {
                title: 'Main',
                items: [
                    { to: UNIFIED_DASHBOARD_PATH, label: 'Dashboard', end: true },
                    {
                        to: '/student/complaints/register',
                        label: 'Register Complaint'
                    },
                    { to: '/student/complaints', label: 'My Complaints' },
                    {
                        to: '/student/all-complaints',
                        label: 'All Complaints'
                    },
                    { to: '/app/profile', label: 'My Profile' },
                    { to: '/student/support', label: 'Support' }
                ]
            }
        ];
    }

    const sections = [
        {
            title: 'Main',
            items: [
                { to: UNIFIED_DASHBOARD_PATH, label: 'Dashboard', end: true }
            ]
        }
    ];

    const staffBase = getStaffBasePath(role);
    if (staffBase && isAdminStaffRole(role)) {
        sections[0].items.push(
            { to: `${staffBase}/complaints`, label: 'Complaints' },
            { to: `${staffBase}/categories`, label: 'Categories' }
        );
    }

    if (role === 'super_admin') {
        sections.push({
            title: 'Administration',
            items: [
                { to: '/complaints', label: 'All Complaints' },
                { to: '/complaints/categories', label: 'Categories' },
                { to: '/users/register', label: 'Register User' },
                { to: '/users/bulk', label: 'Bulk Registration' },
                { to: '/departments', label: 'Departments' }
            ]
        });
    }

    if (canAccessManagementPortal(role)) {
        sections.push({
            title: 'Management',
            items: [
                    { to: '/management/dashboard', label: 'Management Portal' },
                    { to: '/management/users', label: 'All Users' },
                { to: '/management/register', label: 'Register User' },
                { to: '/management/bulk', label: 'Bulk Import' },
                { to: '/management/import-export', label: 'Import / Export' }
            ]
        });
    }

    sections.push({
        title: 'Account',
        items: [{ to: '/app/profile', label: 'My Profile' }]
    });

    return sections;
}
