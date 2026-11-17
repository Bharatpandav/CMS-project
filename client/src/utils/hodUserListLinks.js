const USERS_PATH = '/management/users';

/** All Users link with filters aligned to HOD dashboard shortcuts. */
export function buildHodUsersListLink({ kind }) {
    const params = new URLSearchParams({
        role: kind === 'students' ? 'student' : 'staff',
        status: 'active'
    });
    return `${USERS_PATH}?${params.toString()}`;
}

/** Institution-wide user list filters for VC dashboard cards. */
export function buildVcUsersListLink({ kind }) {
    return buildHodUsersListLink({ kind });
}