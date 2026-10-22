import {
    COMPLAINT_DEPARTMENTS
} from '../constants/complaintDepartments.js';

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
 * Suggested department from category (student may choose a different department).
 */
export function suggestComplaintDepartment(category, student) {
    if (!category) return '';

    const target = (category.targetDepartment || '').trim();
    if (COMPLAINT_DEPARTMENTS.includes(target)) {
        return target;
    }

    if (target === 'Academic Affairs' && student?.department) {
        return mapProfileDepartmentToAllowed(student.department);
    }

    return '';
}

/** @deprecated Use suggestComplaintDepartment */
export function previewResponsibleDepartment(category, student) {
    return suggestComplaintDepartment(category, student);
}
