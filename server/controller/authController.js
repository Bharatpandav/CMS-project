import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';


// Create JWT token
const createToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET
    );
};


// ==================== LOGIN ====================

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find pre-registered user
        const user = await userModel.findOne({
            email: email.toLowerCase()
        });

        // User must already exist in database
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Contact system management.'
            });
        }

        // Verify password
        const isMatch = await bcryptjs.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT containing user ID and role
        const token = createToken(
            user._id.toString(),
            user.role
        );

        // Store token in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isFirstLogin: user.isFirstLogin
            }
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// ==================== CHANGE PASSWORD ====================

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Check required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate new password length
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        // Find authenticated user
        const user = await userModel.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Contact system management.'
            });
        }

        // Verify current password
        const isMatch = await bcryptjs.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Prevent using the same password
        const isSamePassword = await bcryptjs.compare(
            newPassword,
            user.password
        );

        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password'
            });
        }

        // Hash new password
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(
            newPassword,
            salt
        );

        // Update password
        user.password = hashedPassword;

        // First login is now completed
        user.isFirstLogin = false;

        await user.save();

        return res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.log(error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


// ==================== LOGOUT ====================

const logoutUser = (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        return res.json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


export {
    loginUser,
    changePassword,
    logoutUser
};