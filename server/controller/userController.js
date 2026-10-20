import bcryptjs from 'bcryptjs';
import userModel from '../models/userModel.js';
import generatePassword from '../utils/generatePassword.js';

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
            const existingRoll = await userModel.findOne({
                rollNumber: rollNumber.trim()
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

export { createUser };