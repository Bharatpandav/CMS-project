import User from '../models/userModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import { getDepartmentHodLookupCandidates } from '../constants/complaintDepartments.js';

export const TERMINAL_STATUSES = ['resolved', 'rejected', 'withdrawn'];

export const normalizeStatus = (status) =>
    status === 'pending' ? 'submitted' : status;

export const loadActor = async (userId) =>
    User.findById(userId).select('role department isActive name');

export const findDepartmentHod = async (department) => {
    const candidates = getDepartmentHodLookupCandidates(department);
    for (const dept of candidates) {
        const hod = await User.findOne({
            role: 'hod',
            department: dept,
            isActive: true
        });
        if (hod) return hod;
    }
    return null;
};

export const findInstitutionalDean = async () =>
    User.findOne({
        role: 'dean',
        isActive: true
    });

export const findViceChancellor = async () =>
    User.findOne({
        role: 'super_admin',
        isActive: true
    });

/** @deprecated Use client-selected department; kept for legacy callers */
export const resolveResponsibleDepartment = (categoryDoc, student) => {
    let department = categoryDoc.targetDepartment;

    if (department === 'Academic Affairs' && student.department) {
        department = student.department;
    }

    return department;
};

export const recordComplaintLog = async ({
    complaintId,
    actor,
    previousStatus,
    newStatus,
    previousAssignee,
    newAssignee,
    level,
    action,
    remarks
}) => {
    await ComplaintLog.create({
        complaint: complaintId,
        actor: actor?._id || null,
        actorRole: actor?.role || null,
        previousStatus: previousStatus || null,
        newStatus: newStatus || null,
        previousAssignee: previousAssignee || null,
        newAssignee: newAssignee || null,
        level,
        assignedTo: newAssignee || null,
        action,
        remarks: remarks || ''
    });
};

export const isTerminalStatus = (status) =>
    TERMINAL_STATUSES.includes(status);

export const actorIsAssignee = (complaint, actorId) =>
    complaint.currentAssignee?.toString() === actorId?.toString();

export const actorIsDepartmentHod = (complaint, actor) =>
    actor?.role === 'hod' &&
    actor.department &&
    complaint.department === actor.department;

export const canActAsCurrentHandler = (complaint, actor) => {
    if (!actor?.isActive) {
        return false;
    }

    if (actorIsAssignee(complaint, actor._id)) {
        return true;
    }

    if (
        actor.role === 'hod' &&
        complaint.currentLevel === 'hod' &&
        actorIsDepartmentHod(complaint, actor) &&
        ['submitted', 'pending', 'escalated', 'accepted', 'assigned'].includes(
            complaint.status
        )
    ) {
        return true;
    }

    if (
        actor.role === 'dean' &&
        complaint.currentLevel === 'dean' &&
        ['submitted', 'pending', 'escalated', 'accepted', 'assigned'].includes(
            complaint.status
        )
    ) {
        return true;
    }

    if (
        actor.role === 'super_admin' &&
        complaint.currentLevel === 'vc' &&
        ['submitted', 'pending', 'escalated', 'accepted', 'assigned'].includes(
            complaint.status
        )
    ) {
        return true;
    }

    return false;
};

export const validateAssignTarget = async ({
    complaint,
    assigner,
    assigneeId
}) => {
    const assignee = await User.findById(assigneeId);

    if (!assignee || !assignee.isActive) {
        return {
            ok: false,
            message: 'Assignee must be an active registered user'
        };
    }

    if (assigner.role === 'hod') {
        if (assignee.role === 'advisor') {
            if (assignee.department !== complaint.department) {
                return {
                    ok: false,
                    message:
                        'Advisor must belong to the complaint responsible department'
                };
            }

            return { ok: true, assignee, nextLevel: 'advisor' };
        }

        if (assignee.role === 'dean') {
            return { ok: true, assignee, nextLevel: 'dean' };
        }

        return {
            ok: false,
            message: 'HOD may assign only to an Advisor or Dean'
        };
    }

    if (assigner.role === 'dean') {
        if (assignee.role === 'hod') {
            if (assignee.department !== complaint.department) {
                return {
                    ok: false,
                    message:
                        'HOD must belong to the complaint responsible department'
                };
            }

            return { ok: true, assignee, nextLevel: 'hod' };
        }

        if (assignee.role === 'advisor') {
            if (assignee.department !== complaint.department) {
                return {
                    ok: false,
                    message:
                        'Advisor must belong to the complaint responsible department'
                };
            }

            return { ok: true, assignee, nextLevel: 'advisor' };
        }

        return {
            ok: false,
            message: 'Dean may assign only to an HOD or Advisor'
        };
    }

    return {
        ok: false,
        message: 'Not authorized to assign this complaint'
    };
};

const ACCEPT_FROM = ['submitted', 'pending', 'assigned', 'escalated'];
const REJECT_FROM = ['submitted', 'pending', 'assigned'];
const ASSIGN_FROM = [
    'submitted',
    'pending',
    'accepted',
    'assigned',
    'escalated'
];
const ESCALATE_FROM = ['accepted', 'assigned', 'escalated', 'submitted'];
const RESOLVE_FROM = ['accepted', 'assigned', 'escalated', 'submitted'];

export const assertTransition = (action, currentStatus) => {
    const status = normalizeStatus(currentStatus);
    const rules = {
        accept: ACCEPT_FROM,
        reject: REJECT_FROM,
        assign: ASSIGN_FROM,
        escalate: ESCALATE_FROM,
        resolve: RESOLVE_FROM
    };

    const allowed = rules[action];

    if (
        !allowed ||
        (!allowed.includes(status) && !allowed.includes(currentStatus))
    ) {
        return {
            ok: false,
            message: `Cannot ${action} complaint while status is ${currentStatus}`
        };
    }

    return { ok: true };
};

export const getListFilterForRole = (role, userId, department) => {
    if (role === 'student') {
        return null;
    }

    if (role === 'advisor') {
        return { currentAssignee: userId };
    }

    if (role === 'hod') {
        return { department };
    }

    if (role === 'dean') {
        return {
            $or: [{ currentLevel: 'dean' }, { currentAssignee: userId }]
        };
    }

    if (role === 'super_admin') {
        return {
            $or: [{ currentLevel: 'vc' }, { currentAssignee: userId }]
        };
    }

    return { _id: null };
};
