import express from 'express';

import {
    createUser
} from '../controller/userController.js';

import {
    bulkCreateUsers
} from '../controller/bulkUserController.js';

import authUser from '../middleware/auth.js';
import authorizeUserManagement from '../middleware/authorizeUserManagement.js';
import uploadCSV from '../middleware/uploadCSV.js';

const userManagementRouter = express.Router();

userManagementRouter.post(
    '/',
    authUser,
    authorizeUserManagement,
    createUser
);

userManagementRouter.post(
    '/bulk',
    authUser,
    uploadCSV.single('file'),
    bulkCreateUsers
);

export default userManagementRouter;