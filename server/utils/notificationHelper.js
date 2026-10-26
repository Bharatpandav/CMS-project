import Notification from '../models/notificationModel.js';

export async function createNotification({
    userId,
    title,
    message,
    type = 'system',
    relatedComplaint = null
}) {
    if (!userId) return null;
    return Notification.create({
        user: userId,
        title,
        message,
        type,
        relatedComplaint,
        read: false
    });
}

function userIdOf(value) {
    if (!value) return '';
    return String(value._id || value);
}

export async function notifyUsers(userIds, { title, message, type = 'complaint', relatedComplaint = null }) {
    const unique = [...new Set(userIds.map(userIdOf).filter(Boolean))];
    if (!unique.length) return;
    await Notification.insertMany(
        unique.map((user) => ({
            user,
            title,
            message,
            type,
            relatedComplaint,
            read: false
        }))
    );
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
