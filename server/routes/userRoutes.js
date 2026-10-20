import express from 'express';

import {
    loginUser,
    getCurrentUser,
    changePassword,
    logoutUser
} from '../controller/authController.js';
import { getAssignableUsers } from '../controller/userController.js';

import authUser from '../middleware/auth.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';


const userRouter = express.Router();


// User login
userRouter.post('/login', loginUser);


// Authenticated profile (read-only)
userRouter.get('/me', authUser, getCurrentUser);

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