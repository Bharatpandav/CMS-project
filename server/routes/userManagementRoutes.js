import express from 'express';

import {
    createUser
} from '../controller/userController.js';

import authUser from '../middleware/auth.js';
import authorizeUserManagement from '../middleware/authorizeUserManagement.js';

const userManagementRouter = express.Router();

userManagementRouter.post(
    '/',
    authUser,
    authorizeUserManagement,
    createUser
);

export default userManagementRouter;