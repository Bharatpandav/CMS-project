/**
 * Canonical departments students may select when registering a complaint.
 * HOD routing uses DEPARTMENT_HOD_LOOKUP_ALIASES for legacy user records.
 */
export const COMPLAINT_DEPARTMENTS = [
    'Applied Sciences & Humanities',
    'Department of Management',
    'Chemical Engineering',
    'Computer Science & Engineering',
    'Electronics & Electrical Engineering',
    'Bio-Technology',
    'Mechanical Engineering',
    'Civil Engineering',
    'Agriculture Science'
];

/** Alternate spellings stored on HOD/student user profiles */
export const DEPARTMENT_HOD_LOOKUP_ALIASES = {
    'Applied Sciences & Humanities': ['Applied Sciences & Humanities'],
    'Department of Management': ['Department of Management'],
    'Chemical Engineering': ['Chemical Engineering'],
    'Computer Science & Engineering': [
        'Computer Science & Engineering',
        'Computer Science and Engineering'
    ],
    'Electronics & Electrical Engineering': [
        'Electronics & Electrical Engineering',
        'Electronics and Communication Engineering',
        'Electronics and Electrical Engineering'
    ],
    'Bio-Technology': ['Bio-Technology', 'Biotechnology', 'Bio Technology'],
    'Mechanical Engineering': ['Mechanical Engineering'],
    'Civil Engineering': ['Civil Engineering'],
    'Agriculture Science': ['Agriculture Science', 'Agricultural Science']
};

export function isAllowedComplaintDepartment(value) {
    const trimmed = (value || '').trim();
    return COMPLAINT_DEPARTMENTS.includes(trimmed);
}

export function getDepartmentHodLookupCandidates(canonicalDepartment) {
    const key = (canonicalDepartment || '').trim();
    const aliases = DEPARTMENT_HOD_LOOKUP_ALIASES[key];
    if (aliases?.length) {
        return [...new Set([key, ...aliases])];
    }
    return key ? [key] : [];
}

const normalize = (s) =>
    (s || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

export function mapProfileDepartmentToAllowed(profileDepartment) {
    if (!profileDepartment) return '';
    const norm = normalize(profileDepartment);
    for (const dept of COMPLAINT_DEPARTMENTS) {
        if (normalize(dept) === norm) return dept;
    }
    if (norm.includes('computer science')) {
        return 'Computer Science & Engineering';
    }
    if (
        norm.includes('electronics') &&
        (norm.includes('communication') || norm.includes('electrical'))
    ) {
        return 'Electronics & Electrical Engineering';
    }
    if (norm.includes('mechanical')) return 'Mechanical Engineering';
    if (norm.includes('civil')) return 'Civil Engineering';
    if (norm.includes('chemical')) return 'Chemical Engineering';
    if (norm.includes('biotech')) return 'Bio-Technology';
    if (norm.includes('agriculture')) return 'Agriculture Science';
    if (norm.includes('management')) return 'Department of Management';
    return '';
}

/**
 * Suggested department from category config (student may override).
 */
export function suggestComplaintDepartment(categoryDoc, student) {
    if (!categoryDoc) return '';

    const target = (categoryDoc.targetDepartment || '').trim();
    if (isAllowedComplaintDepartment(target)) {
        return target;
    }

    if (target === 'Academic Affairs' && student?.department) {
        return mapProfileDepartmentToAllowed(student.department);
    }

    return '';
}
