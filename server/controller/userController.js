import bcryptjs from 'bcryptjs';
import userModel from '../models/userModel.js';
import {
    buildInitialUserPassword,
    parseDateOfBirthInput
} from '../utils/devCredentialPatterns.js';
import escapeRegExp from '../utils/escapeRegExp.js';
import { allowedRoles } from '../middleware/authorizeUserManagement.js';
import { publishUserStatsInvalidation } from '../utils/dashboardEventHub.js';
import { applyDepartmentUserFilter } from '../utils/departmentUserFilter.js';
import {
    departmentsAlign,
    findInstitutionalDean,
    findViceChancellor
} from '../utils/complaintWorkflowHelper.js';

const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            role,
            department,
            rollNumber,
            semester,
            section,
            dateOfBirth
        } = req.body;

        // Validate required fields
        if (!name || !email || !role) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and role are required'
            });
        }

        const validRoles = [
            'student',
            'advisor',
            'hod',
            'dean',
            'super_admin'
        ];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role provided'
            });
        }

        const rolesCreatorCanCreate = allowedRoles[req.user?.role];

        if (
            !rolesCreatorCanCreate ||
            !rolesCreatorCanCreate.includes(role)
        ) {
            return res.status(403).json({
                success: false,
                message: `You are not authorized to create a ${role} account`
            });
        }

        const creator = await userModel
            .findById(req.user.id)
            .select('role department isActive')
            .lean();

        if (!creator?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive'
            });
        }

        let assignedDepartment = department?.trim() || undefined;

        if (creator.role === 'hod') {
            const hodDepartment = (creator.department || '').trim();
            if (!hodDepartment) {
                return res.status(422).json({
                    success: false,
                    message:
                        'Your HOD account has no department assigned. Contact the administrator before registering users.'
                });
            }

            if (!['student', 'advisor'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    message:
                        'HOD accounts may only register Student and Advisor users'
                });
            }

            const requestedDept = (department || '').trim();
            if (requestedDept && requestedDept !== hodDepartment) {
                return res.status(403).json({
                    success: false,
                    message:
                        'You cannot register users outside your own department'
                });
            }

            assignedDepartment = hodDepartment;
        }

        if (creator.role === 'advisor') {
            if (role !== 'student') {
                return res.status(403).json({
                    success: false,
                    message:
                        'Advisor accounts may only register Student users'
                });
            }

            const requestedDept = (department || '').trim();
            if (!requestedDept) {
                return res.status(400).json({
                    success: false,
                    message: 'Department is required for student accounts'
                });
            }

            assignedDepartment = requestedDept;
        }

        // Student-specific required fields
        if (role === 'student' && (!rollNumber || !rollNumber.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Student accounts require a roll number / URN'
            });
        }

        if (
            (role === 'student' || role === 'advisor') &&
            creator.role === 'hod' &&
            !assignedDepartment
        ) {
            return res.status(422).json({
                success: false,
                message: 'Department assignment is required'
            });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if email already exists
        const existingEmail = await userModel.findOne({
            email: normalizedEmail
        });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Check if student roll number / URN already exists
        if (role === 'student' && rollNumber) {
            const trimmedRoll = rollNumber.trim();
            const existingRoll = await userModel.findOne({
                rollNumber: {
                    $regex: new RegExp(
                        `^${escapeRegExp(trimmedRoll)}$`,
                        'i'
                    )
                }
            });

            if (existingRoll) {
                return res.status(409).json({
                    success: false,
                    message:
                        'A user with this roll number / URN already exists'
                });
            }
        }

        let parsedDateOfBirth = null;
        if (role !== 'student') {
            if (!dateOfBirth) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Date of birth is required for staff and admin accounts (YYYY-MM-DD)'
                });
            }
            parsedDateOfBirth = parseDateOfBirthInput(dateOfBirth);
            if (!parsedDateOfBirth) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid date of birth. Use YYYY-MM-DD format.'
                });
            }
        }

        let temporaryPassword;
        try {
            temporaryPassword = buildInitialUserPassword({
                role,
                name: name.trim(),
                rollNumber: rollNumber?.trim(),
                dateOfBirth: parsedDateOfBirth
            });
        } catch (passwordError) {
            return res.status(400).json({
                success: false,
                message:
                    passwordError.message ||
                    'Could not generate initial password'
            });
        }

        const hashedPassword = await bcryptjs.hash(temporaryPassword, 10);

        // Create user with mandatory first login flag
        const user = await userModel.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role,
            department: assignedDepartment,
            rollNumber: rollNumber?.trim() || undefined,
            semester: semester ? Number(semester) : undefined,
            section: section?.trim() || undefined,
            dateOfBirth: parsedDateOfBirth || undefined,
            isFirstLogin: true,
            isActive: true
        });

        // Determine role-specific login identifier
        const loginIdentifier =
            user.role === 'student'
                ? user.rollNumber
                : user.email;

        publishUserStatsInvalidation(
            user.department ? [user.department] : []
        );

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber,
                loginIdentifier,
                isFirstLogin: user.isFirstLogin
            },
            loginIdentifier,
            temporaryPassword
        });
    } catch (error) {
        console.error('Create user error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAssignableUsers = async (req, res) => {
    try {
        const actor = await userModel
            .findById(req.user.id)
            .select('role department isActive');

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const department = (req.query.department || '').trim();

        let filter;

        if (actor.role === 'hod') {
            if (!department) {
                return res.status(400).json({
                    success: false,
                    message: 'department query parameter is required'
                });
            }
            if (!actor.department) {
                return res.status(403).json({
                    success: false,
                    message: 'HOD department is not configured'
                });
            }
            if (!departmentsAlign(actor.department, department)) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Not authorized to assign users for this department'
                });
            }
            filter = { isActive: true, role: 'advisor' };
            applyDepartmentUserFilter(filter, actor.department);
        } else if (actor.role === 'dean') {
            filter = { isActive: true, role: 'hod' };
        } else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to list assignable users'
            });
        }

        const users = await userModel
            .find(filter)
            .select('name email role department')
            .sort(
                actor.role === 'dean'
                    ? { department: 1, name: 1 }
                    : { role: 1, name: 1 }
            )
            .lean();

        return res.json({ success: true, users });
    } catch (error) {
        console.error('Assignable users error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getEscalationTargets = async (req, res) => {
    try {
        const actor = await userModel
            .findById(req.user.id)
            .select('role department isActive');

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const department = (req.query.department || '').trim();

        if (actor.role === 'hod') {
            if (
                department &&
                actor.department &&
                !departmentsAlign(actor.department, department)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Not authorized to escalate complaints for this department'
                });
            }

            const dean = await findInstitutionalDean();
            if (!dean) {
                return res.json({ success: true, users: [] });
            }

            return res.json({
                success: true,
                users: [
                    {
                        _id: dean._id,
                        name: dean.name,
                        email: dean.email,
                        role: dean.role,
                        department: dean.department || ''
                    }
                ]
            });
        }

        if (actor.role === 'dean') {
            const vc = await findViceChancellor();
            if (!vc) {
                return res.json({ success: true, users: [] });
            }

            return res.json({
                success: true,
                users: [
                    {
                        _id: vc._id,
                        name: vc.name,
                        email: vc.email,
                        role: vc.role,
                        department: vc.department || ''
                    }
                ]
            });
        }

        return res.status(403).json({
            success: false,
            message: 'Not authorized to list escalation targets'
        });
    } catch (error) {
        console.error('Escalation targets error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export { createUser, getAssignableUsers, getEscalationTargets };