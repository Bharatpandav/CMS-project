/** Mirror server/utils/userManageableRoles.js */
const MANAGEABLE_TARGET_ROLES = {
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

export function canPermanentlyDeleteUser(actorRole, targetRole) {
    return canManageTargetUserRole(actorRole, targetRole);
}