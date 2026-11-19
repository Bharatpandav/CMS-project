import { departmentsAlign } from './complaintWorkflowHelper.js';
import { canManageTargetUserRole } from './userManageableRoles.js';

/**
 * Whether actor may permanently delete a user of targetRole (not including self-check).
 */
export function canPermanentlyDeleteUser(actorRole, targetRole) {
    return canManageTargetUserRole(actorRole, targetRole);
}

export function assertDeleteTargetInManagementScope(actor, target) {
    if (actor.role === 'hod' || actor.role === 'advisor') {
        if (
            !actor.department ||
            !target.department ||
            !departmentsAlign(actor.department, target.department)
        ) {
            return {
                ok: false,
                message:
                    'You may only delete users within your own department scope'
            };
        }
    }

    return { ok: true };
}