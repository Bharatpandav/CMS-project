/** Mirrors server/middleware/authorizeUserManagement.js */
export const CREATABLE_ROLES_BY_ACTOR = {
    super_admin: ['student', 'advisor', 'hod', 'dean'],
    dean: ['student', 'advisor', 'hod'],
    hod: ['student', 'advisor'],
    advisor: ['student'],
    student: []
};

export function rolesActorMayAssign(actorRole) {
    return CREATABLE_ROLES_BY_ACTOR[actorRole] || [];
}
