import bcryptjs from 'bcryptjs';
import userModel from '../models/userModel.js';
import generatePassword from '../utils/generatePassword.js';
import escapeRegExp from '../utils/escapeRegExp.js';
import { allowedRoles } from '../middleware/authorizeUserManagement.js';

const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            role,
            department,
            rollNumber,
            semester,
            section
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

        // Student-specific required fields
        if (role === 'student' && (!rollNumber || !rollNumber.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Student accounts require a roll number / URN'
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

        // Cryptographically secure temporary password generation
        const temporaryPassword = generatePassword();

        // Hash password before storing in MongoDB
        const hashedPassword = await bcryptjs.hash(temporaryPassword, 10);

        // Create user with mandatory first login flag
        const user = await userModel.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role,
            department: department?.trim() || undefined,
            rollNumber: rollNumber?.trim() || undefined,
            semester: semester ? Number(semester) : undefined,
            section: section?.trim() || undefined,
            isFirstLogin: true,
            isActive: true
        });

        // Determine role-specific login identifier
        const loginIdentifier =
            user.role === 'student'
                ? user.rollNumber
                : user.email;

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

        if (!department) {
            return res.status(400).json({
                success: false,
                message: 'department query parameter is required'
            });
        }

        let filter;

        if (actor.role === 'hod') {
            filter = {
                isActive: true,
                $or: [
                    { role: 'advisor', department },
                    { role: 'dean' }
                ]
            };
        } else if (actor.role === 'dean') {
            filter = {
                isActive: true,
                $or: [
                    { role: 'hod', department },
                    { role: 'advisor', department }
                ]
            };
        } else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to list assignable users'
            });
        }

        const users = await userModel
            .find(filter)
            .select('name email role department')
            .sort({ role: 1, name: 1 })
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

export { createUser, getAssignableUsers };