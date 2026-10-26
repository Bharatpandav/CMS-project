import express from 'express';

import {
    getCategories,
    getComplaintDepartments,
    getPublicComplaintStats,
    createComplaint,
    getComplaints,
    getComplaintById,
    getComplaintContact,
    addComplaintComment,
    inviteToComplaint,
    getMyInvitations,
    respondToInvitation,
    joinComplaint,
    leaveComplaint,
    withdrawComplaint,
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
complaintRouter.get('/departments', getComplaintDepartments);
complaintRouter.get('/public-stats', getPublicComplaintStats);

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

complaintRouter.get(
    '/get/:id/contact',
    authUser,
    requirePasswordChange,
    getComplaintContact
);

complaintRouter.post(
    '/get/:id/comments',
    authUser,
    requirePasswordChange,
    addComplaintComment
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

complaintRouter.post(
    '/:id/withdraw',
    authUser,
    requirePasswordChange,
    withdrawComplaint
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