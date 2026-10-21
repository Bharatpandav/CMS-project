import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import escapeRegExp from '../utils/escapeRegExp.js';

const PROTECTED_PROFILE_FIELDS = [
    'name',
    'email',
    'role',
    'department',
    'rollNumber',
    'semester',
    'section',
    'isActive',
    'isFirstLogin'
];

// Create JWT token
const createToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// ==================== LOGIN ====================
const loginUser = async (req, res) => {
    try {
        const identifier = (
            req.body.identifier ||
            req.body.rollNumber ||
            req.body.urn ||
            req.body.email ||
            ''
        ).trim();
        const { password } = req.body;

        // Check required fields
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Login identifier (email or student roll number / URN) and password are required'
            });
        }

        // Find pre-registered user
        // If identifier contains '@', query by email; otherwise query by student rollNumber
        let user;
        if (identifier.includes('@')) {
            user = await userModel.findOne({
                email: identifier.toLowerCase()
            });
        } else {
            // Case-insensitive lookup by student rollNumber / URN
            user = await userModel.findOne({
                rollNumber: {
                    $regex: new RegExp(
                        `^${escapeRegExp(identifier)}$`,
                        'i'
                    )
                }
            });
        }

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

        // Verify password hash
        const isMatch = await bcryptjs.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT containing user ID and role
        const token = createToken(user._id.toString(), user.role);

        // Store token in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const loginIdentifier =
            user.role === 'student'
                ? user.rollNumber || user.email
                : user.email;

        return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber || undefined,
                department: user.department || undefined,
                loginIdentifier,
                isFirstLogin: user.isFirstLogin
            }
        });
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// ==================== CURRENT USER PROFILE ====================
const getCurrentUser = async (req, res) => {
    try {
        const user = await userModel
            .findById(req.user.id)
            .select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive. Contact system management.'
            });
        }

        const loginIdentifier =
            user.role === 'student'
                ? user.rollNumber || user.email
                : user.email;

        return res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber || undefined,
                department: user.department || undefined,
                semester: user.semester ?? undefined,
                section: user.section || undefined,
                loginIdentifier,
                isFirstLogin: user.isFirstLogin,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Get current user error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// ==================== CHANGE PASSWORD (FIRST-LOGIN & REGULAR) ====================
const changePassword = async (req, res) => {
    try {
        const tamperedProfileField = PROTECTED_PROFILE_FIELDS.some(
            (field) =>
                Object.prototype.hasOwnProperty.call(req.body, field)
        );

        if (tamperedProfileField) {
            return res.status(400).json({
                success: false,
                message:
                    'Profile fields cannot be changed through the password change endpoint'
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Check required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
        }

        // Validate new password length policy
        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        // Password complexity policy: at least 1 uppercase, 1 lowercase, 1 digit
        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!complexityRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    'New password must contain at least one uppercase letter, one lowercase letter, and one number'
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

        // Prevent reusing the same password
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

        // Hash new password securely
        const salt = await bcryptjs.genSalt(10);
        const hashedPassword = await bcryptjs.hash(newPassword, salt);

        // Profile Protection: Strictly update only password and first-login state
        // Rejects any tampering with name, role, email, rollNumber, department, etc.
        user.password = hashedPassword;
        user.isFirstLogin = false;

        await user.save();

        // Refresh authentication token with updated credentials state
        const refreshedToken = createToken(user._id.toString(), user.role);

        res.cookie('token', refreshedToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: 'Password changed successfully',
            token: refreshedToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isFirstLogin: false
            }
        });
    } catch (error) {
        console.error('Change password error:', error);

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

export { loginUser, getCurrentUser, changePassword, logoutUser };