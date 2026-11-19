import express from 'express';
import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';
import { getDeanDashboardStats } from '../controller/deanDashboardController.js';

const deanRouter = express.Router();

deanRouter.get(
    '/dashboard-stats',
    authUser,
    requirePasswordChange,
    getDeanDashboardStats
);

export default deanRouter;