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
    markAllNotificationsRead
} from '../controller/notificationController.js';
import { getAssignableUsers } from '../controller/userController.js';

import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';


const userRouter = express.Router();


// User login
userRouter.post('/login', loginUser);
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/reset-password', resetPasswordWithToken);

// Authenticated profile (read-only)
userRouter.get('/me', authUser, getCurrentUser);
userRouter.patch('/me', authUser, requirePasswordChange, updateProfile);

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

// Change password
// Authentication required
userRouter.post('/change-password', authUser, changePassword);


// User logout
userRouter.post('/logout', logoutUser);


export default userRouter;