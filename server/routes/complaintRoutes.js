import express from 'express';

import {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaintStatus,
    assignComplaint,
    escalateComplaint
} from '../controller/complaintController.js';

import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';

const complaintRouter = express.Router();

complaintRouter.post(
    '/create',
    authUser,
    requirePasswordChange,
    createComplaint
);

complaintRouter.get(
    '/get',
    authUser,
    requirePasswordChange,
    getComplaints
);

complaintRouter.get(
    '/get/:id',
    authUser,
    requirePasswordChange,
    getComplaintById
);

complaintRouter.put(
    '/updateComplaintStatus/:id',
    authUser,
    requirePasswordChange,
    updateComplaintStatus
);

complaintRouter.put(
    '/update/:id',
    authUser,
    requirePasswordChange,
    updateComplaintStatus
);

complaintRouter.put(
    '/assign/:id',
    authUser,
    requirePasswordChange,
    assignComplaint
);

complaintRouter.put(
    '/escalate/:id',
    authUser,
    requirePasswordChange,
    escalateComplaint
);

export default complaintRouter;