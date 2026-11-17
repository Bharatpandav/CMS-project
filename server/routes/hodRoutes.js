import express from 'express';
import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';
import { getHodDashboardStats } from '../controller/hodDashboardController.js';

const hodRouter = express.Router();

// GET /api/hod/dashboard-stats
// Accessible only to authenticated HOD accounts.
// Department scope is resolved server-side from the user's DB record.
hodRouter.get(
    '/dashboard-stats',
    authUser,
    requirePasswordChange,
    getHodDashboardStats
);

export default hodRouter;
