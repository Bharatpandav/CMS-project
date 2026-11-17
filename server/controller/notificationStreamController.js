import User from '../models/userModel.js';
import { registerNotificationStreamClient } from '../utils/notificationEventHub.js';

/**
 * GET /api/user/notifications/stream?token=
 * SSE channel for real-time notification invalidation.
 */
export const streamNotificationEvents = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).end();
    }

    const actor = await User.findById(userId).select('isActive').lean();
    if (!actor?.isActive) {
        return res.status(403).end();
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(': connected\n\n');

    const cleanup = registerNotificationStreamClient(res, userId);

    const heartbeat = setInterval(() => {
        try {
            res.write(': ping\n\n');
        } catch {
            clearInterval(heartbeat);
            cleanup();
        }
    }, 25000);

    req.on('close', () => {
        clearInterval(heartbeat);
        cleanup();
    });
};