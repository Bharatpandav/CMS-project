import express from 'express';

import {
    getCategories,
    createComplaint,
    getComplaints,
    getComplaintById,
    inviteToComplaint,
    getMyInvitations,
    respondToInvitation,
    joinComplaint,
    leaveComplaint,
    updateComplaintStatus,
    assignComplaint,
    escalateComplaint,
    resolveComplaint
} from '../controller/complaintController.js';

import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';

const complaintRouter = express.Router();

// 1. Complaint Categories
complaintRouter.get('/categories', getCategories);

// 2. Student Group Invitations
complaintRouter.get(
    '/my-invitations',
    authUser,
    requirePasswordChange,
    getMyInvitations
);

complaintRouter.post(
    '/invitations/:invitationId/respond',
    authUser,
    requirePasswordChange,
    respondToInvitation
);

// 3. Create & List Complaints
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

// 4. Group Complaint Participation (Join / Leave / Invite)
complaintRouter.post(
    '/:id/invite',
    authUser,
    requirePasswordChange,
    inviteToComplaint
);

complaintRouter.post(
    '/:id/join',
    authUser,
    requirePasswordChange,
    joinComplaint
);

complaintRouter.post(
    '/:id/leave',
    authUser,
    requirePasswordChange,
    leaveComplaint
);

// 5. Workflow Management (Assign, Status, Escalate, Resolve)
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

complaintRouter.put(
    '/resolve/:id',
    authUser,
    requirePasswordChange,
    resolveComplaint
);

export default complaintRouter;