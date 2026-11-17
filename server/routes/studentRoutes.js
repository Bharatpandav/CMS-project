import express from 'express';
import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';
import { getStudentDashboardStats } from '../controller/studentDashboardController.js';

const studentRouter = express.Router();

studentRouter.get(
    '/dashboard-stats',
    authUser,
    requirePasswordChange,
    getStudentDashboardStats
);

export default studentRouter;