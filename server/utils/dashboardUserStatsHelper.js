import userModel from '../models/userModel.js';
import { applyDepartmentUserFilter } from './departmentUserFilter.js';

/** Staff counted toward department "Active Staff" (matches HOD dashboard). */
export const DEPARTMENT_STAFF_ROLES = ['advisor', 'hod'];

/** Institution-wide staff roles for dean / super_admin dashboards. */
export const INSTITUTION_STAFF_ROLES = [
    'advisor',
    'hod',
    'dean',
    'super_admin'
];

/**
 * @param {{ role?: string, department?: string }} actor
 * @returns {{ scope: 'department' | 'institution', department: string | null }}
 */
export function resolveUserStatsScope(actor) {
    const role = actor?.role;
    if (role === 'hod' || role === 'advisor') {
        const department = (actor.department || '').trim();
        return { scope: 'department', department: department || null };
    }
    return { scope: 'institution', department: null };
}

/**
 * @param {{ scope: 'department' | 'institution', department: string | null }} scopeConfig
 */
export async function countDashboardUserStats(scopeConfig) {
    const baseStudent = { role: 'student', isActive: true };
    const staffRoles =
        scopeConfig.scope === 'department'
            ? DEPARTMENT_STAFF_ROLES
            : INSTITUTION_STAFF_ROLES;
    const baseStaff = { role: { $in: staffRoles }, isActive: true };

    if (scopeConfig.scope === 'department' && scopeConfig.department) {
        applyDepartmentUserFilter(baseStudent, scopeConfig.department);
        applyDepartmentUserFilter(baseStaff, scopeConfig.department);
    }

    const [
        activeStudents,
        activeStaff,
        totalStudents,
        totalStaff,
        activeAccounts,
        inactiveAccounts,
        totalUsers
    ] = await Promise.all([
        userModel.countDocuments(baseStudent),
        userModel.countDocuments(baseStaff),
        userModel.countDocuments(
            scopeConfig.scope === 'department' && scopeConfig.department
                ? (() => {
                      const q = { role: 'student' };
                      applyDepartmentUserFilter(q, scopeConfig.department);
                      return q;
                  })()
                : { role: 'student' }
        ),
        userModel.countDocuments(
            scopeConfig.scope === 'department' && scopeConfig.department
                ? (() => {
                      const q = { role: { $in: staffRoles } };
                      applyDepartmentUserFilter(q, scopeConfig.department);
                      return q;
                  })()
                : { role: { $in: staffRoles } }
        ),
        userModel.countDocuments(
            (() => {
                const q = { isActive: true };
                if (
                    scopeConfig.scope === 'department' &&
                    scopeConfig.department
                ) {
                    applyDepartmentUserFilter(q, scopeConfig.department);
                }
                return q;
            })()
        ),
        userModel.countDocuments(
            (() => {
                const q = { isActive: false };
                if (
                    scopeConfig.scope === 'department' &&
                    scopeConfig.department
                ) {
                    applyDepartmentUserFilter(q, scopeConfig.department);
                }
                return q;
            })()
        ),
        userModel.countDocuments(
            scopeConfig.scope === 'department' && scopeConfig.department
                ? (() => {
                      const q = {};
                      applyDepartmentUserFilter(q, scopeConfig.department);
                      return q;
                  })()
                : {}
        )
    ]);

    return {
        totalUsers,
        totalStudents,
        totalStaff,
        activeStudents,
        activeStaff,
        activeAccounts,
        inactiveAccounts,
        scope: scopeConfig.scope,
        department: scopeConfig.department
    };
}

/**
 * Collect department strings affected by a user record change.
 * @param {object | null | undefined} before
 * @param {object | null | undefined} after
 */
export function collectAffectedDepartments(before, after) {
    const deps = new Set();
    for (const record of [before, after]) {
        if (!record) continue;
        const d = (record.department || '').trim();
        if (d) deps.add(d);
    }
    return [...deps];
}