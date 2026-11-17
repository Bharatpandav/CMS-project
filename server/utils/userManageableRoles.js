/**
 * Roles an actor may update, activate/deactivate, or permanently delete
 * (includes same authority level, e.g. HOD → HOD). Creation uses allowedRoles only.
 */
export const MANAGEABLE_TARGET_ROLES = {
    super_admin: ['super_admin', 'dean', 'hod', 'advisor', 'student'],
    dean: ['dean', 'hod', 'advisor', 'student'],
    hod: ['hod', 'advisor', 'student'],
    advisor: ['advisor', 'student'],
    student: []
};

export function canManageTargetUserRole(actorRole, targetRole) {
    if (!actorRole || !targetRole) {
        return false;
    }
    return (MANAGEABLE_TARGET_ROLES[actorRole] || []).includes(targetRole);
}