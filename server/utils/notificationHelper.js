import Notification from '../models/notificationModel.js';
import User from '../models/userModel.js';
import {
    publishNotificationEvent,
    publishNotificationEvents
} from './notificationEventHub.js';

const DEDUPE_MS = 90_000;

export async function createNotification({
    userId,
    title,
    message,
    type = 'system',
    relatedComplaint = null,
    action = '',
    actorName = ''
}) {
    if (!userId) return null;
    const doc = await Notification.create({
        user: userId,
        title,
        message,
        type,
        relatedComplaint,
        action,
        actorName,
        read: false
    });
    publishNotificationEvent(String(userId));
    return doc;
}

function userIdOf(value) {
    if (!value) return '';
    return String(value._id || value);
}

export async function notifyUsers(
    userIds,
    {
        title,
        message,
        type = 'complaint',
        relatedComplaint = null,
        action = '',
        actorName = ''
    }
) {
    const unique = [...new Set(userIds.map(userIdOf).filter(Boolean))];
    if (!unique.length) return;
    await Notification.insertMany(
        unique.map((user) => ({
            user,
            title,
            message,
            type,
            relatedComplaint,
            action,
            actorName,
            read: false
        }))
    );
    publishNotificationEvents(unique);
}

export async function notifyComplaintWatchers(
    complaint,
    { title, message, actorId = null, extraUserIds = [] } = {}
) {
    const ids = new Set();
    const add = (value) => {
        const id = userIdOf(value);
        if (id && id !== userIdOf(actorId)) ids.add(id);
    };
    add(complaint?.raisedBy);
    for (const person of complaint?.participants || []) add(person.student);
    for (const extra of extraUserIds) add(extra);
    await notifyUsers([...ids], {
        title,
        message,
        type: 'complaint',
        relatedComplaint: complaint?._id
    });
}

const ACTION_TITLES = {
    assigned: 'Complaint assigned to you',
    escalated: 'Complaint escalated to you',
    returned: 'Complaint returned to you',
    resolved: 'Your complaint was resolved',
    closed: 'Complaint closed',
    submitted: 'New complaint submitted',
    accepted: 'Complaint accepted',
    rejected: 'Complaint rejected'
};

const STAFF_TRACKING_TITLES = {
    submitted: 'New complaint submitted',
    accepted: 'Complaint accepted',
    rejected: 'Complaint rejected',
    assigned: 'Complaint assigned',
    escalated: 'Complaint escalated',
    returned: 'Complaint escalated',
    resolved: 'Complaint resolved',
    closed: 'Complaint closed'
};

export async function collectHodAdminRecipientIds(
    complaint,
    { excludeIds = [] } = {}
) {
    const exclude = new Set(excludeIds.map(userIdOf));
    const ids = new Set();
    const department = (complaint?.department || '').trim();

    if (department) {
        const hods = await User.find({
            role: 'hod',
            department,
            isActive: true
        })
            .select('_id')
            .lean();
        for (const hod of hods) {
            const id = userIdOf(hod._id);
            if (id && !exclude.has(id)) ids.add(id);
        }
    }

    const admins = await User.find({ role: 'super_admin', isActive: true })
        .select('_id')
        .lean();
    for (const admin of admins) {
        const id = userIdOf(admin._id);
        if (id && !exclude.has(id)) ids.add(id);
    }

    return [...ids];
}

/**
 * Notify department HOD(s) and administrators about workflow / status updates.
 */
export async function notifyComplaintTrackingStaff({
    complaint,
    actor = null,
    action,
    message = '',
    title = ''
}) {
    if (!complaint?._id) return;

    const actorId = userIdOf(actor);
    const publicId = complaint?.publicId || String(complaint._id);
    const eventTitle =
        title ||
        STAFF_TRACKING_TITLES[action] ||
        'Complaint status updated';
    const eventMessage =
        message ||
        `Complaint ${publicId} tracking status changed (${action}).`;

    const recipientIds = await collectHodAdminRecipientIds(complaint, {
        excludeIds: [actorId]
    });

    if (!recipientIds.length) return;

    for (const userId of recipientIds) {
        const recent = await Notification.findOne({
            user: userId,
            relatedComplaint: complaint._id,
            action,
            createdAt: { $gte: new Date(Date.now() - DEDUPE_MS) }
        })
            .select('_id')
            .lean();

        if (recent) continue;

        await createNotification({
            userId,
            title: eventTitle,
            message: eventMessage,
            type: 'complaint',
            relatedComplaint: complaint._id,
            action,
            actorName: actor?.name || ''
        });
    }
}

export async function notifyNewComplaintSubmitted({
    complaint,
    student,
    routedAssigneeId = null
}) {
    if (!complaint?._id) return;

    const publicId = complaint.publicId || String(complaint._id);
    const studentName = student?.name || 'A student';
    const message = `${studentName} submitted complaint ${publicId}: "${complaint.title}".`;

    const staffIds = await collectHodAdminRecipientIds(complaint, {
        excludeIds: [userIdOf(student)]
    });
    const assigneeId = userIdOf(routedAssigneeId);
    const recipients = new Set(staffIds);
    if (assigneeId) recipients.add(assigneeId);

    if (assigneeId) {
        await createNotification({
            userId: assigneeId,
            title: 'New complaint for you',
            message,
            type: 'complaint',
            relatedComplaint: complaint._id,
            action: 'submitted',
            actorName: studentName
        });
    }

    const observerOnly = staffIds.filter((id) => id !== assigneeId);
    if (observerOnly.length) {
        await notifyUsers(observerOnly, {
            title: 'New complaint submitted',
            message,
            type: 'complaint',
            relatedComplaint: complaint._id,
            action: 'submitted',
            actorName: studentName
        });
    }
}

/**
 * Notify only explicit action recipients (with near-duplicate suppression).
 */
export async function notifyActionRecipients({
    recipientIds,
    complaint,
    actor,
    action,
    remarks = '',
    attachmentCount = 0
}) {
    const actorId = userIdOf(actor?._id || actor);
    const actorName = actor?.name || 'Staff';
    const publicId = complaint?.publicId || String(complaint?._id || '');
    const title = ACTION_TITLES[action] || 'Complaint update';

    const unique = [
        ...new Set(recipientIds.map(userIdOf).filter(Boolean))
    ].filter((id) => id !== actorId);

    if (!unique.length) return;

    let message = '';
    switch (action) {
        case 'assigned':
            message = `${actorName} assigned complaint ${publicId} to you.`;
            break;
        case 'escalated':
            message = `${actorName} escalated complaint ${publicId} to you.`;
            break;
        case 'returned':
            message = `${actorName} returned complaint ${publicId} to you.`;
            break;
        case 'resolved':
            message = `${actorName} resolved complaint ${publicId}.`;
            break;
        case 'closed':
            message = actorName
                ? `${actorName} closed complaint ${publicId}.`
                : `Complaint ${publicId} was closed.`;
            break;
        default:
            message = `${actorName} updated complaint ${publicId}.`;
    }

    const trimmedRemarks = String(remarks || '').trim();
    if (trimmedRemarks) {
        message += ` ${trimmedRemarks.slice(0, 220)}`;
    }
    if (attachmentCount > 0) {
        message += ` (${attachmentCount} attachment${attachmentCount > 1 ? 's' : ''} included.)`;
    }

    for (const userId of unique) {
        const recent = await Notification.findOne({
            user: userId,
            relatedComplaint: complaint._id,
            action,
            createdAt: { $gte: new Date(Date.now() - DEDUPE_MS) }
        })
            .select('_id')
            .lean();

        if (recent) continue;

        await createNotification({
            userId,
            title,
            message,
            type: 'complaint',
            relatedComplaint: complaint._id,
            action,
            actorName
        });
    }
}

export function complainantRecipientIds(complaint) {
    const ids = new Set();
    const add = (value) => {
        const id = userIdOf(value);
        if (id) ids.add(id);
    };
    add(complaint?.raisedBy);
    for (const person of complaint?.participants || []) {
        add(person.student);
    }
    return [...ids];
}