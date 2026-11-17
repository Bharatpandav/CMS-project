import { titleWithoutStatus } from './complaintTitle.js';

const STAFF_ROLES = ['advisor', 'hod', 'dean', 'super_admin'];

export function isStaffRole(role) {
    return STAFF_ROLES.includes(role);
}

export function canResolveComplaintContact(user, complaint) {
    if (!user?.id || !complaint) return false;
    const userIdStr = String(user.id);
    const isAssignee =
        complaint.currentAssignee?.toString() === userIdStr ||
        complaint.currentAssignee?._id?.toString() === userIdStr;
    const isDeptHod =
        user.role === 'hod' &&
        user.department &&
        user.department === complaint.department;
    const isScopedDean =
        user.role === 'dean' &&
        (isAssignee || complaint.currentLevel === 'dean');
    const isScopedVc =
        user.role === 'super_admin' &&
        (isAssignee || complaint.currentLevel === 'vc');
    const isAssignedAdvisor = user.role === 'advisor' && isAssignee;

    return (
        isAssignedAdvisor ||
        isDeptHod ||
        isScopedDean ||
        isScopedVc ||
        (user.role === 'super_admin' && isStaffRole(user.role))
    );
}

function isComplaintCreator(user, complaint) {
    const userIdStr = String(user.id);
    return (
        complaint.raisedBy?.toString() === userIdStr ||
        complaint.raisedBy?._id?.toString() === userIdStr
    );
}

function isGroupParticipant(user, complaint) {
    const userIdStr = String(user.id);
    return complaint.participants?.some(
        (p) =>
            p.student?.toString() === userIdStr ||
            p.student?._id?.toString() === userIdStr
    );
}

function redactStudentProfile(profile) {
    if (!profile) return profile;
    const { email, phone, ...rest } =
        typeof profile.toObject === 'function'
            ? profile.toObject()
            : { ...profile };
    return rest;
}

function participantPublicView(participant, studentDoc) {
    const base =
        typeof participant.toObject === 'function'
            ? participant.toObject()
            : { ...participant };
    const student =
        studentDoc && typeof studentDoc === 'object' ? studentDoc : null;
    return {
        student: student?._id || base.student,
        name: base.name || student?.name,
        rollNumber: base.rollNumber || student?.rollNumber,
        department: student?.department || undefined,
        semester: student?.semester ?? undefined,
        section: student?.section || undefined
    };
}

/**
 * Serialize complaint for API responses (strip private contact unless allowed).
 */
export function serializeComplaintForUser(complaint, user, { revealContact = false } = {}) {
    const doc =
        typeof complaint.toObject === 'function'
            ? complaint.toObject({ virtuals: true })
            : { ...complaint };

    delete doc.priority;
    if (doc.title) doc.title = titleWithoutStatus(doc.title);

    const userIdStr = String(user.id);
    const creator = isComplaintCreator(user, doc);
    const participant = isGroupParticipant(user, doc);
    const staff = isStaffRole(user.role);
    const mayRevealContact =
        revealContact && canResolveComplaintContact(user, doc);

    if (creator) {
        return doc;
    }

    if (staff && mayRevealContact) {
        return doc;
    }

    if (staff && !mayRevealContact) {
        const out = { ...doc };
        if (out.studentProfile) {
            out.studentProfile = redactStudentProfile(out.studentProfile);
        }
        if (out.raisedBy && typeof out.raisedBy === 'object') {
            out.raisedBy = {
                _id: out.raisedBy._id,
                name: out.raisedBy.name,
                department: out.raisedBy.department,
                rollNumber: out.raisedBy.rollNumber
            };
        }
        if (Array.isArray(out.participants)) {
            out.participants = out.participants.map((p) =>
                participantPublicView(p, p.student)
            );
        }
        return out;
    }

    if (participant && doc.complaintType === 'group') {
        const out = { ...doc };
        out.studentProfile = redactStudentProfile(out.studentProfile);
        if (out.raisedBy && typeof out.raisedBy === 'object') {
            out.raisedBy = {
                name: out.raisedBy.name,
                department: out.raisedBy.department,
                rollNumber: out.raisedBy.rollNumber
            };
        }
        if (Array.isArray(out.participants)) {
            out.participants = out.participants.map((p) => {
                const sid =
                    p.student?._id?.toString() || p.student?.toString();
                if (sid === userIdStr) {
                    return p;
                }
                return participantPublicView(p, p.student);
            });
        }
        return out;
    }

    if (doc.visibility === 'private' && !creator && !participant) {
        return {
            _id: doc._id,
            publicId: doc.publicId,
            complaintType: doc.complaintType,
            visibility: 'private',
            status: doc.status,
            title: doc.title,
            department: doc.department
        };
    }

    const out = { ...doc };
    out.studentProfile = redactStudentProfile(out.studentProfile);
    if (out.raisedBy && typeof out.raisedBy === 'object') {
            out.raisedBy = {
                _id: out.raisedBy._id,
                department: out.raisedBy.department
            };
    }
    delete out.raisedByName;
    if (Array.isArray(out.participants)) {
        out.participants = out.participants.map((p) =>
            participantPublicView(p, p.student)
        );
    }
    return out;
}

function recordId(value) {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || value.id || '');
    return String(value);
}

export function isComplainantOrParticipant(user, complaint) {
    const userIdStr = String(user?.id || user?._id || '');
    if (!userIdStr) return false;
    const isCreator = recordId(complaint?.raisedBy) === userIdStr;
    const isParticipant = (complaint?.participants || []).some(
        (p) => recordId(p.student) === userIdStr
    );
    return isCreator || isParticipant;
}

const INTERNAL_STUDENT_ACTIONS = new Set([
    'assigned',
    'escalated',
    'returned',
    'contact_viewed',
    'comment'
]);

function leanLog(log) {
    return typeof log.toObject === 'function' ? log.toObject() : { ...log };
}

/**
 * Students/participants only see resolution (and rejection) activity attachments;
 * staff retain full visibility.
 */
export function filterLogsForViewer(logs, user, complaint) {
    if (isStaffRole(user?.role)) {
        return logs;
    }

    const userId = String(user?.id || user?._id || '');
    const isComplainant = isComplainantOrParticipant(user, complaint);

    return (logs || []).map((log) => {
        const doc = leanLog(log);
        if (INTERNAL_STUDENT_ACTIONS.has(doc.action)) {
            return {
                ...doc,
                attachments: [],
                remarks: ''
            };
        }

        if (doc.action === 'resolved' && isComplainant) {
            return doc;
        }

        if (doc.action === 'rejected' && isComplainant) {
            return doc;
        }

        return {
            ...doc,
            attachments: filterAttachmentsForUser(
                doc.attachments,
                userId,
                doc.action,
                isComplainant
            )
        };
    });
}

function filterAttachmentsForUser(
    attachments,
    userId,
    action,
    isComplainant
) {
    const list = attachments || [];
    return list.filter((file) => {
        const intended = recordId(file.intendedRecipient);
        if (intended && intended === userId) return true;
        if (action === 'resolved' && isComplainant) return true;
        return false;
    });
}

/** Hide internal workflow files on the complaint document for students. */
export function filterActionAttachmentsOnComplaint(doc, user) {
    if (isStaffRole(user?.role) || !doc) return doc;
    const out = { ...doc };
    out.attachments = (out.attachments || []).filter(
        (file) =>
            file.source !== 'action' ||
            file.action === 'resolved' ||
            file.action === 'rejected'
    );
    return out;
}
