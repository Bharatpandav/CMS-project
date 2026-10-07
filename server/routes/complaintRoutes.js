import express from 'express';
import { createComplaint, getComplaints, getComplaintById, updateComplaintStatus, assignComplaint, escalateComplaint } from '../controller/complaintController.js';
import authUser from '../middleware/auth.js';

const complaintRouter = express.Router();

complaintRouter.post('/create', authUser, createComplaint);
complaintRouter.get('/get', authUser, getComplaints);
complaintRouter.get('/get/:id', authUser, getComplaintById);

complaintRouter.put('/updateComplaintStatus/:id', authUser, updateComplaintStatus);
complaintRouter.put('/update/:id', authUser, updateComplaintStatus);
complaintRouter.put('/assign/:id', authUser, assignComplaint);
complaintRouter.put('/escalate/:id', authUser, escalateComplaint);

export default complaintRouter;