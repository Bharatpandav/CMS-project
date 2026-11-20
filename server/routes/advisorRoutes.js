import express from 'express';
import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';
import { getAdvisorDashboardStats } from '../controller/advisorDashboardController.js';

const advisorRouter = express.Router();

advisorRouter.get(
    '/dashboard-stats',
    authUser,
    requirePasswordChange,
    getAdvisorDashboardStats
);

export default advisorRouter;