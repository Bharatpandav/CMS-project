import Notification from '../models/notificationModel.js';

async function countUnread(userId) {
    return Notification.countDocuments({
        user: userId,
        read: false
    });
}

export const listNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const notifications = await Notification.find({ user: userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .populate('relatedComplaint', 'publicId title')
            .lean();

        const unreadCount = await countUnread(userId);

        return res.json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        console.error('List notifications error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const dismissNotification = async (req, res) => {
    try {
        const removed = await Notification.findOneAndDelete({
            _id: req.params.id,
            user: req.user.id
        });
        if (!removed) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        const unreadCount = await countUnread(req.user.id);
        return res.json({ success: true, unreadCount });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const updated = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.id },
            { read: true },
            { new: true }
        );
        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }
        const unreadCount = await countUnread(req.user.id);
        return res.json({
            success: true,
            notification: updated,
            unreadCount
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ user: req.user.id });
        return res.json({ success: true, unreadCount: 0 });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user.id, read: false },
            { read: true }
        );
        const unreadCount = await countUnread(req.user.id);
        return res.json({ success: true, unreadCount });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
