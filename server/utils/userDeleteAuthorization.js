import { departmentsAlign } from './complaintWorkflowHelper.js';
import { canManageTargetUserRole } from './userManageableRoles.js';

/**
 * Whether actor may permanently delete a user of targetRole (not including self-check).
 */
export function canPermanentlyDeleteUser(actorRole, targetRole) {
    return canManageTargetUserRole(actorRole, targetRole);
}

export function assertDeleteTargetInManagementScope(actor, target) {
    if (actor.role === 'hod') {
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

    if (actor.role === 'advisor') {
        if (target.role !== 'student') {
            return {
                ok: false,
                message:
                    'Advisors may only manage student accounts'
            };
        }
        const actorDept = (actor.department || '').trim();
        if (actorDept) {
            if (
                !target.department ||
                !departmentsAlign(actor.department, target.department)
            ) {
                return {
                    ok: false,
                    message:
                        'You may only manage students within your department scope'
                };
            }
        }
    }

    return { ok: true };
}