import User from '../models/userModel.js';
import { MANAGEMENT_PORTAL_ROLES } from '../middleware/authorizeManagement.js';
import {
    registerDashboardStreamClient
} from '../utils/dashboardEventHub.js';

/**
 * GET /api/dashboard/stream?token=
 * SSE channel for dashboard statistic invalidation (admin roles only).
 */
export const streamDashboardEvents = async (req, res) => {
    const role = req.user?.role;

    if (!MANAGEMENT_PORTAL_ROLES.includes(role)) {
        return res.status(403).end();
    }

    let department = null;
    if (role === 'hod' || role === 'advisor') {
        const actor = await User.findById(req.user.id)
            .select('department isActive')
            .lean();
        if (!actor?.isActive) {
            return res.status(403).end();
        }
        department = (actor.department || '').trim() || null;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(': connected\n\n');

    const cleanup = registerDashboardStreamClient(res, {
        role,
        department
    });

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