import express from 'express';

import {
    loginUser,
    changePassword,
    logoutUser
} from '../controller/authController.js';

import authUser from '../middleware/auth.js';


const userRouter = express.Router();


// User login
userRouter.post('/login', loginUser);


// Change password
// Authentication required
userRouter.post('/change-password', authUser, changePassword);


// User logout
userRouter.post('/logout', logoutUser);


export default userRouter;