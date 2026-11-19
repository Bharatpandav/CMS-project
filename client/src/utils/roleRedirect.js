import { getPostLoginDestination } from './appPaths.js';
import { isAdminStaffRole } from './staffRoles.js';

export function getPostLoginPath(user) {
    return getPostLoginDestination(user);
}

export function getAdminLoginPath(user) {
    if (!user) {
        return '/?admin=1';
    }
    if (user.isFirstLogin) {
        return '/change-password';
    }
    if (isAdminStaffRole(user.role)) {
        return getPostLoginDestination(user);
    }
    return null;
}
