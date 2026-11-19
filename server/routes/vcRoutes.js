import express from 'express';
import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';
import { getVcDashboardStats } from '../controller/vcDashboardController.js';

const vcRouter = express.Router();

vcRouter.get(
    '/dashboard-stats',
    authUser,
    requirePasswordChange,
    getVcDashboardStats
);

export default vcRouter;