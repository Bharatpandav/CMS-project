import express from 'express';
import { createComplaint, getComplaints, getComplaintById, updateComplaintStatus, assignComplaint, escalateComplaint } from '../controller/complaintController.js';
import authUser from '../middleware/auth.js';

const complaintRouter = express.Router();

complaintRouter.post('/createComplaint', authUser, createComplaint);
complaintRouter.get('/getComplaints', authUser, getComplaints);
complaintRouter.get('/getComplaintById/:id', authUser, getComplaintById);
complaintRouter.put('/updateComplaintStatus/:id', authUser, updateComplaintStatus);
complaintRouter.put('/assignComplaint/:id', authUser, assignComplaint);
complaintRouter.put('/escalateComplaint/:id', authUser, escalateComplaint);

export default complaintRouter;