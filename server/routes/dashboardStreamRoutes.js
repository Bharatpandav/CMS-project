import express from 'express';
import sseAuth from '../middleware/sseAuth.js';
import { streamDashboardEvents } from '../controller/dashboardStreamController.js';

const dashboardStreamRouter = express.Router();

dashboardStreamRouter.get('/stream', sseAuth, streamDashboardEvents);

export default dashboardStreamRouter;