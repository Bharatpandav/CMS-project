import User from '../models/userModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import { getDepartmentHodLookupCandidates } from '../constants/complaintDepartments.js';
import { getDepartmentUserFilterValues } from './departmentUserFilter.js';

export const departmentsAlign = (a, b) => {
    if (!a || !b) return false;
    const left = getDepartmentUserFilterValues(a);
    const right = getDepartmentUserFilterValues(b);
    return left.some((value) => right.includes(value));
};

export const TERMINAL_STATUSES = ['resolved', 'closed', 'rejected', 'withdrawn'];

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
    remarks,
    attachments = [],
    actionRecipient = null
}) => {
    return ComplaintLog.create({
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
        remarks: remarks || '',
        attachments: Array.isArray(attachments) ? attachments : [],
        actionRecipient: actionRecipient || newAssignee || null
    });
};

export const isTerminalStatus = (status) =>
    TERMINAL_STATUSES.includes(status);

export const actorIsAssignee = (complaint, actorId) =>
    complaint.currentAssignee?.toString() === actorId?.toString();

export const actorIsDepartmentHod = (complaint, actor) =>
    actor?.role === 'hod' &&
    actor.department &&
    departmentsAlign(actor.department, complaint.department);

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
        if (assignee.role !== 'advisor') {
            return {
                ok: false,
                message: 'HOD may assign only to an Advisor in their department'
            };
        }

        if (
            !departmentsAlign(assignee.department, complaint.department) ||
            !departmentsAlign(assignee.department, assigner.department)
        ) {
            return {
                ok: false,
                message:
                    'Advisor must belong to your department and the complaint department'
            };
        }

        return { ok: true, assignee, nextLevel: 'advisor' };
    }

    if (assigner.role === 'dean') {
        if (assignee.role !== 'hod') {
            return {
                ok: false,
                message: 'Dean may assign only to an HOD'
            };
        }

        return { ok: true, assignee, nextLevel: 'hod' };
    }

    return {
        ok: false,
        message: 'Not authorized to assign this complaint'
    };
};

const ACCEPT_FROM = ['submitted', 'pending', 'assigned', 'escalated'];
const REJECT_FROM = ['submitted', 'pending', 'assigned'];
const ASSIGN_FROM = ['accepted', 'assigned', 'escalated', 'reopened'];
const ESCALATE_FROM = ['accepted', 'assigned', 'escalated', 'reopened'];
const RESOLVE_FROM = ['accepted', 'assigned', 'escalated', 'reopened'];
const CLOSE_FROM = ['resolved'];

export const AWAITING_INITIAL_ACCEPTANCE = ['submitted', 'pending'];

export const requiresInitialAcceptance = (status) => {
    const normalized = normalizeStatus(status);
    return AWAITING_INITIAL_ACCEPTANCE.includes(normalized);
};

export const assertTransition = (action, currentStatus) => {
    const status = normalizeStatus(currentStatus);
    const transitionKey =
        action === 'accepted'
            ? 'accept'
            : action === 'rejected'
              ? 'reject'
              : action;
    const rules = {
        accept: ACCEPT_FROM,
        reject: REJECT_FROM,
        assign: ASSIGN_FROM,
        escalate: ESCALATE_FROM,
        resolve: RESOLVE_FROM,
        close: CLOSE_FROM
    };

    const allowed = rules[transitionKey];

    if (
        !allowed ||
        (!allowed.includes(status) && !allowed.includes(currentStatus))
    ) {
        return {
            ok: false,
            message: `Cannot ${transitionKey} complaint while status is ${currentStatus}`
        };
    }

    return { ok: true };
};

export const canAuthorizeComplaintClose = (complaint, actor) => {
    if (!actor?.isActive || actor.role !== 'hod') {
        return false;
    }
    if (complaint?.status !== 'resolved') {
        return false;
    }
    if (!actorIsDepartmentHod(complaint, actor)) {
        return false;
    }
    const authorized = String(
        complaint?.closureAuthorizedHod || complaint?.assignedBy || ''
    );
    const actorId = String(actor._id);
    return Boolean(authorized) && authorized === actorId;
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
