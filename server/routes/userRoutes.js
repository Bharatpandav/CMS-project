import express from 'express';
import {
    loginUser,
    logoutUser
} from '../controller/authController.js';

const userRouter = express.Router();

userRouter.post('/login', loginUser);
userRouter.post('/logout', logoutUser);

export default userRouter;