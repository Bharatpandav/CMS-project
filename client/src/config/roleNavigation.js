import {
    canAccessManagementPortal,
    getPortalManagementNavItems
} from '../utils/managementAccess.js';
import { getPostLoginDestination, UNIFIED_DASHBOARD_PATH } from '../utils/appPaths.js';
import { getStaffBasePath, isAdminStaffRole } from '../utils/staffRoles.js';

/**
 * Primary navigation for the unified portal shell.
 */
export function getPortalNavSections(user) {
    const role = (user?.role || '').trim().toLowerCase();
    if (!role) return [];

    if (role === 'student') {
        return [
            {
                title: 'Main',
                items: [
                    { to: '/student/dashboard', label: 'Dashboard', end: true },
                    {
                        to: '/student/complaints/register',
                        label: 'Register Complaint'
                    },
                    { to: '/student/complaints', label: 'My Complaints' },
                    {
                        to: '/student/all-complaints',
                        label: 'All Complaints'
                    },
                    { to: '/app/profile', label: 'My Profile' }
                ]
            }
        ];
    }

    const dashboardPath =
        role === 'hod' ||
        role === 'dean' ||
        role === 'advisor' ||
        role === 'super_admin'
            ? getPostLoginDestination({ role })
            : UNIFIED_DASHBOARD_PATH;

    const sections = [
        {
            title: 'Main',
            items: [{ to: dashboardPath, label: 'Dashboard', end: true }]
        }
    ];

    const staffBase = getStaffBasePath(role);
    if (staffBase && isAdminStaffRole(role)) {
        sections[0].items.push({
            to: `${staffBase}/complaints`,
            label: 'Complaints'
        });
    }

    if (canAccessManagementPortal(role)) {
        sections.push({
            title: 'Management',
            items: getPortalManagementNavItems()
        });
    }

    sections.push({
        title: 'Account',
        items: [{ to: '/app/profile', label: 'My Profile' }]
    });

    return sections;
}
