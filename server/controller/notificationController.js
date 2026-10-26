import Notification from '../models/notificationModel.js';

export const listNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            user: req.user.id,
            read: false
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        const unreadCount = await Notification.countDocuments({
            user: req.user.id,
            read: false
        });

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
        return res.json({ success: true });
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
        return res.json({ success: true, notification: updated });
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
        return res.json({ success: true });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
