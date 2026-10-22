import { getStaffRoleLabel } from './staffRoles.js';

const NA = 'Not provided';

function formatStatus(isActive) {
    if (isActive === true) return 'Active';
    if (isActive === false) return 'Inactive';
    return NA;
}

function formatDob(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function roleLabel(role) {
    if (role === 'super_admin') {
        return 'Vice Chancellor / Super Admin';
    }
    return getStaffRoleLabel(role) || role || NA;
}

/**
 * Returns ordered { iconKey, label, value } rows for the profile card.
 */
export function getProfileFieldRows(profile) {
    if (!profile) return [];

    const role = profile.role;
    const rows = [];

    const push = (iconKey, label, value) => {
        if (value === null || value === undefined || value === '') {
            return;
        }
        rows.push({ iconKey, label, value });
    };

    const pushOrNa = (iconKey, label, value) => {
        rows.push({ iconKey, label, value: value || NA });
    };

    if (role === 'student') {
        pushOrNa('graduation-cap', 'URN / Roll Number', profile.rollNumber);
        pushOrNa('user', 'Full Name', profile.name);
        pushOrNa('mail', 'Email Address', profile.email);
        pushOrNa('building', 'Department', profile.department);
        push('book', 'Programme / Degree', profile.programme);
        if (profile.semester != null && profile.semester !== '') {
            pushOrNa('calendar', 'Semester', `Semester ${profile.semester}`);
        }
        push('type', 'Section', profile.section);
        push('user-check', 'Advisor', profile.assignedAdvisor);
        pushOrNa('badge-check', 'Role', roleLabel(role));
        pushOrNa('circle-check', 'Account Status', formatStatus(profile.isActive));
        return rows;
    }

    pushOrNa('user', 'Full Name', profile.name);
    push('fingerprint', 'Employee ID', profile.rollNumber);
    pushOrNa('mail', 'Email Address', profile.email);

    const dob = formatDob(profile.dateOfBirth);
    if (dob) {
        push('calendar', 'Date of Birth', dob);
    }

    if (role === 'advisor') {
        pushOrNa('building', 'Department', profile.department);
    } else if (role === 'hod') {
        pushOrNa('building', 'Department Managed', profile.department);
    } else if (role === 'dean') {
        push('building', 'Faculty / Department Scope', profile.department);
    } else if (role === 'super_admin') {
        push('university', 'Institution', 'University (system-wide)');
    }

    pushOrNa('badge-check', 'Role', roleLabel(role));
    pushOrNa('circle-check', 'Account Status', formatStatus(profile.isActive));

    return rows;
}

export function getProfileHomePath(pathname) {
    if (pathname.startsWith('/management')) {
        return '/management/dashboard';
    }
    return '/app/dashboard';
}

export function getProfileRouteForPath(pathname) {
    if (pathname.startsWith('/management')) {
        return '/management/profile';
    }
    return '/app/profile';
}
