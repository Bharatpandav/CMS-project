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

        const validRoles = ['student', 'advisor', 'hod', 'dean', 'super_admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role provided'
            });
        }

        // Check if email already exists
        const existingUser = await userModel.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists'
            });
        }

        // Generate temporary password
        const temporaryPassword = generatePassword();

        // Hash password before storing
        const hashedPassword = await bcryptjs.hash(
            temporaryPassword,
            10
        );

        // Create user
        const user = await userModel.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            role,
            department,
            rollNumber,
            semester,
            section,
            isFirstLogin: true,
            isActive: true
        });

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
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

export {
    createUser
};