import express from 'express';

import { createUser } from '../controller/userController.js';
import { bulkCreateUsers } from '../controller/bulkUserController.js';
import {
    exportUsersCsv,
    getUserById,
    getUserStats,
    listUsers,
    setUserStatus,
    updateUser
} from '../controller/managementUserController.js';

import authUser from '../middleware/auth.js';
import authorizeUserManagement, {
    authorizeUserCreationAccess
} from '../middleware/authorizeUserManagement.js';
import authorizeManagementAccess from '../middleware/authorizeManagement.js';
import requirePasswordChange from '../middleware/requirePasswordChange.js';
import uploadCSV from '../middleware/uploadCSV.js';

const userManagementRouter = express.Router();

const managementChain = [
    authUser,
    requirePasswordChange,
    authorizeManagementAccess
];

userManagementRouter.get('/stats', ...managementChain, getUserStats);
userManagementRouter.get('/export', ...managementChain, exportUsersCsv);
userManagementRouter.get('/', ...managementChain, listUsers);
userManagementRouter.get('/:id', ...managementChain, getUserById);
userManagementRouter.patch('/:id', ...managementChain, updateUser);
userManagementRouter.patch('/:id/status', ...managementChain, setUserStatus);

userManagementRouter.post(
    '/',
    authUser,
    requirePasswordChange,
    authorizeUserManagement,
    createUser
);

userManagementRouter.post(
    '/bulk',
    authUser,
    requirePasswordChange,
    authorizeUserCreationAccess,
    uploadCSV.single('file'),
    bulkCreateUsers
);

export default userManagementRouter;
