import User from '../models/userModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import {
    findInstitutionalDean,
    recordComplaintLog
} from './complaintWorkflowHelper.js';

function leanUser(ref) {
    if (!ref) return null;
    if (typeof ref === 'object' && ref.name) {
        return {
            name: String(ref.name).trim(),
            role: ref.role || 'dean'
        };
    }
    return null;
}

function isVcLevelComplaint(complaint) {
    const level = String(complaint?.currentLevel || '').toLowerCase();
    if (level === 'vc') return true;
    const assigneeRole =
        complaint?.currentAssignee?.role ||
        (typeof complaint?.currentAssignee === 'object'
            ? complaint.currentAssignee?.role
            : '');
    return assigneeRole === 'super_admin';
}

function vcAssigneeId(complaint) {
    const ref = complaint?.currentAssignee;
    return ref?._id || ref || null;
}

/**
 * Dean who last routed this complaint to VC (for assignment/escalation UI).
 */
export async function resolveDeanHandoffForVc(complaint, logs = []) {
    if (!isVcLevelComplaint(complaint)) {
        return null;
    }

    const sorted = [...logs].sort(
        (a, b) =>
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
    );

    const vcEscalation = [...sorted]
        .reverse()
        .find(
            (log) =>
                log?.action === 'escalated' &&
                String(log.level || '').toLowerCase() === 'vc'
        );

    if (vcEscalation) {
        const fromActor = leanUser(vcEscalation.actor);
        if (fromActor?.name) {
            return {
                name: fromActor.name,
                role: fromActor.role || vcEscalation.actorRole || 'dean'
            };
        }
    }

    const vcId = vcAssigneeId(complaint);
    if (vcId) {
        const handoffToVc = [...sorted].reverse().find((log) => {
          if (log?.action !== 'escalated' && log?.action !== 'assigned') {
              return false;
          }
          const rid = log.newAssignee?._id || log.newAssignee;
          if (!rid || String(rid) !== String(vcId)) return false;
          const actorRole = log.actorRole || log.actor?.role;
          return actorRole === 'dean';
      });
        if (handoffToVc) {
            const fromActor = leanUser(handoffToVc.actor);
            if (fromActor?.name) {
                return { name: fromActor.name, role: 'dean' };
            }
        }
    }

    const assigned = leanUser(complaint?.assignedBy);
    if (assigned?.name && (!assigned.role || assigned.role === 'dean')) {
        return { name: assigned.name, role: assigned.role || 'dean' };
    }

    const deanEscalation = [...sorted]
        .reverse()
        .find((log) => {
            if (log?.action !== 'escalated') return false;
            const role = log.actorRole || log.actor?.role;
            return role === 'dean';
        });

    if (deanEscalation) {
        const fromActor = leanUser(deanEscalation.actor);
        if (fromActor?.name) {
            return { name: fromActor.name, role: 'dean' };
        }
    }

    const assignedId =
        complaint?.assignedBy?._id || complaint?.assignedBy || null;

    if (assignedId && !assigned?.name) {
        const user = await User.findById(assignedId)
            .select('name role')
            .lean();
        if (user?.name && user.role === 'dean') {
            return { name: user.name, role: 'dean' };
        }
    }

    return null;
}

/**
 * Legacy VC complaints (e.g. test seed) may lack dean escalation logs — repair once.
 * @returns {Promise<{ name: string, role: string } | null>}
 */
export async function backfillVcDeanHandoffIfMissing(complaint) {
    if (!isVcLevelComplaint(complaint)) {
        return null;
    }

    const dean = await findInstitutionalDean();
    if (!dean?.name) {
        return null;
    }

    if (!complaint.assignedBy) {
        complaint.assignedBy = dean._id;
        await complaint.save();
    }

    const existing = await ComplaintLog.exists({
        complaint: complaint._id,
        action: 'escalated',
        level: 'vc'
    });

    if (!existing) {
        await recordComplaintLog({
            complaintId: complaint._id,
            actor: dean,
            previousStatus: complaint.status,
            newStatus: complaint.status,
            newAssignee:
                complaint.currentAssignee?._id || complaint.currentAssignee,
            level: 'vc',
            action: 'escalated',
            remarks: '',
            actionRecipient:
                complaint.currentAssignee?._id || complaint.currentAssignee
        });
    }

    return { name: dean.name, role: 'dean' };
}