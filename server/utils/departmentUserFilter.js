import {
    DEPARTMENT_HOD_LOOKUP_ALIASES,
    getDepartmentHodLookupCandidates,
    mapProfileDepartmentToAllowed
} from '../constants/complaintDepartments.js';

const normalize = (s) =>
    (s || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

/**
 * All department strings stored on user profiles that belong to the same dept.
 */
export function getDepartmentUserFilterValues(department) {
    const trimmed = (department || '').trim();
    if (!trimmed) return [];

    for (const [canonical, aliases] of Object.entries(
        DEPARTMENT_HOD_LOOKUP_ALIASES
    )) {
        const variants = [canonical, ...aliases];
        if (
            variants.some(
                (v) => v === trimmed || normalize(v) === normalize(trimmed)
            )
        ) {
            return [...new Set(variants)];
        }
    }

    const mapped = mapProfileDepartmentToAllowed(trimmed);
    if (mapped) {
        return getDepartmentHodLookupCandidates(mapped);
    }

    return [trimmed];
}

/** Apply department filter on a MongoDB query (handles spelling aliases). */
export function applyDepartmentUserFilter(filter, department) {
    const values = getDepartmentUserFilterValues(department);
    if (!values.length) return;

    filter.department = values.length === 1 ? values[0] : { $in: values };
}

/** Complaint list/stats match for HOD (canonical + alias department names). */
export function buildDepartmentComplaintFilter(department) {
    const filter = {};
    applyDepartmentUserFilter(filter, department);
    return filter;
}

/**
 * HOD sees department complaints AND anything assigned to them (same as notifications).
 */
export function buildHodComplaintScopeFilter(department, hodUserId) {
    const deptPart = buildDepartmentComplaintFilter(department);
    const clauses = [];

    if (deptPart.department) {
        clauses.push({ department: deptPart.department });
    }

    if (hodUserId) {
        clauses.push({ currentAssignee: hodUserId });
    }

    if (!clauses.length) {
        return { _id: null };
    }
    if (clauses.length === 1) {
        return clauses[0];
    }
    return { $or: clauses };
}