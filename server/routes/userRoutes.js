import express from 'express';

import {
    loginUser,
    getCurrentUser,
    changePassword,
    logoutUser,
    updateProfile,
    forgotPassword,
    resetPasswordWithToken
} from '../controller/authController.js';
import {
    listNotifications,
    dismissNotification,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications
} from '../controller/notificationController.js';
import { streamNotificationEvents } from '../controller/notificationStreamController.js';
import sseAuth from '../middleware/sseAuth.js';
import {
    getAssignableUsers,
    getEscalationTargets
} from '../controller/userController.js';

import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';


const userRouter = express.Router();


// User login
userRouter.post('/login', loginUser);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPasswordWithToken);

// Authenticated profile (read-only)
userRouter.get('/me', authUser, getCurrentUser);
// Rejects self-service name/email/phone changes (password uses POST /change-password)
userRouter.patch('/me', authUser, requirePasswordChange, updateProfile);

userRouter.get(
    '/notifications/stream',
    sseAuth,
    streamNotificationEvents
);
userRouter.get('/notifications', authUser, requirePasswordChange, listNotifications);
userRouter.delete(
    '/notifications/:id',
    authUser,
    requirePasswordChange,
    dismissNotification
);
userRouter.patch(
    '/notifications/read-all',
    authUser,
    requirePasswordChange,
    markAllNotificationsRead
);
userRouter.delete(
    '/notifications',
    authUser,
    requirePasswordChange,
    clearAllNotifications
);
userRouter.patch(
    '/notifications/:id/read',
    authUser,
    requirePasswordChange,
    markNotificationRead
);

userRouter.get(
    '/assignable',
    authUser,
    requirePasswordChange,
    getAssignableUsers
);
userRouter.get(
    '/escalation-targets',
    authUser,
    requirePasswordChange,
    getEscalationTargets
);

// Change password
// Authentication required
userRouter.post('/change-password', authUser, changePassword);


// User logout
userRouter.post('/logout', logoutUser);


export default userRouter;