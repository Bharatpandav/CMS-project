import { allowedRoles } from './authorizeUserManagement.js';
import { canManageTargetUserRole } from '../utils/userManageableRoles.js';

export const MANAGEMENT_PORTAL_ROLES = [
    'super_admin',
    'dean',
    'hod',
    'advisor'
];

export const canAccessManagementPortal = (role) =>
    MANAGEMENT_PORTAL_ROLES.includes(role);

const authorizeManagementAccess = (req, res, next) => {
    const role = req.user?.role;

    if (!canAccessManagementPortal(role)) {
        return res.status(403).json({
            success: false,
            message:
                'You are not authorized to access the management portal'
        });
    }

    const creatable = allowedRoles[role];

    if (!creatable || creatable.length === 0) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to manage users'
        });
    }

    req.managementCreatableRoles = creatable;
    next();
};

export const assertCanManageTargetRole = (actorRole, targetRole) =>
    canManageTargetUserRole(actorRole, targetRole);

export default authorizeManagementAccess;
