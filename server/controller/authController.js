import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';
import escapeRegExp from '../utils/escapeRegExp.js';
import { validateStudentUrn } from '../utils/urnValidation.js';
import { validateEmailAddress } from '../utils/emailValidation.js';
import { validatePhone } from '../utils/phoneValidation.js';
import { rateLimit } from '../utils/rateLimit.js';
import { getEmailConfigError, sendMail } from '../utils/emailService.js';

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
        const loginChannel = req.body.loginChannel || 'auto';
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
                message: 'Login identifier and password are required'
            });
        }

        let user;

        if (loginChannel === 'student') {
            const urnCheck = validateStudentUrn(identifier);
            if (!urnCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: urnCheck.message
                });
            }
            user = await userModel.findOne({
                rollNumber: {
                    $regex: new RegExp(
                        `^${escapeRegExp(urnCheck.urn)}$`,
                        'i'
                    )
                }
            });
        } else if (loginChannel === 'staff') {
            const emailCheck = validateEmailAddress(identifier);
            if (!emailCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: emailCheck.message
                });
            }
            user = await userModel.findOne({ email: emailCheck.email });
        } else if (identifier.includes('@')) {
            const emailCheck = validateEmailAddress(identifier);
            if (!emailCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: emailCheck.message
                });
            }
            user = await userModel.findOne({ email: emailCheck.email });
        } else {
            const urnCheck = validateStudentUrn(identifier);
            if (!urnCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: urnCheck.message
                });
            }
            user = await userModel.findOne({
                rollNumber: {
                    $regex: new RegExp(
                        `^${escapeRegExp(urnCheck.urn)}$`,
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
                phone: user.phone || undefined,
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
                programme: user.programme || undefined,
                assignedAdvisor: user.assignedAdvisor || undefined,
                dateOfBirth: user.dateOfBirth || undefined,
                phone: user.phone || undefined,
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

const updateProfile = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const updates = {};
        const { email, phone, name } = req.body;

        if (user.role === 'student') {
            if (
                (email !== undefined &&
                    String(email).trim().toLowerCase() !== user.email) ||
                (phone !== undefined &&
                    String(phone).trim() !== (user.phone || ''))
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        'Email and phone are managed by the university and cannot be changed here'
                });
            }
        } else if (email !== undefined) {
            const emailCheck = validateEmailAddress(email);
            if (!emailCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: emailCheck.message
                });
            }
            const clash = await userModel.findOne({
                email: emailCheck.email,
                _id: { $ne: user._id }
            });
            if (clash) {
                return res.status(409).json({
                    success: false,
                    message: 'That email is already in use'
                });
            }
            updates.email = emailCheck.email;
        }

        if (phone !== undefined && user.role !== 'student') {
            const phoneCheck = validatePhone(phone, { required: false });
            if (!phoneCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: phoneCheck.message
                });
            }
            updates.phone = phoneCheck.phone;
        }

        if (name !== undefined && user.role !== 'student') {
            const trimmed = String(name).trim();
            if (!trimmed) {
                return res.status(400).json({
                    success: false,
                    message: 'Name cannot be empty'
                });
            }
            updates.name = trimmed;
        }

        Object.assign(user, updates);
        await user.save();

        const loginIdentifier =
            user.role === 'student'
                ? user.rollNumber || user.email
                : user.email;

        return res.json({
            success: true,
            message: 'Profile updated',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber || undefined,
                department: user.department || undefined,
                semester: user.semester ?? undefined,
                section: user.section || undefined,
                programme: user.programme || undefined,
                phone: user.phone || undefined,
                loginIdentifier,
                isFirstLogin: user.isFirstLogin,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const GENERIC_RESET_MESSAGE =
    'If an account exists for that email, password reset instructions have been sent.';

const forgotPassword = async (req, res) => {
    try {
        const ip = req.ip || 'unknown';
        if (!rateLimit(`forgot:${ip}`, { windowMs: 15 * 60 * 1000, max: 10 })) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Try again later.'
            });
        }

        const emailCheck = validateEmailAddress(req.body.email);
        if (!emailCheck.ok) {
            return res.status(400).json({
                success: false,
                message: emailCheck.message
            });
        }

        const configError = getEmailConfigError();
        if (configError) {
            return res.status(503).json({
                success: false,
                message: configError
            });
        }

        const user = await userModel
            .findOne({ email: emailCheck.email })
            .select('+passwordResetTokenHash +passwordResetExpires');

        if (user?.isActive) {
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto
                .createHash('sha256')
                .update(rawToken)
                .digest('hex');
            user.passwordResetTokenHash = tokenHash;
            user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
            await user.save();

            const base =
                process.env.CLIENT_URL ||
                process.env.APP_URL ||
                'http://localhost:5173';
            const resetUrl = `${base.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

            await sendMail({
                to: user.email,
                subject: 'UCMS password reset',
                text: `Use this link to reset your password (valid for 1 hour): ${resetUrl}`,
                html: `<p>Use this link to reset your password (valid for 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
            });
        }

        return res.json({
            success: true,
            message: GENERIC_RESET_MESSAGE
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        if (error.code === 'EMAIL_NOT_CONFIGURED') {
            return res.status(503).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const resetPasswordWithToken = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
        if (!complexityRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    'New password must contain at least one uppercase letter, one lowercase letter, and one number'
            });
        }

        const tokenHash = crypto
            .createHash('sha256')
            .update(String(token))
            .digest('hex');

        const user = await userModel
            .findOne({
                passwordResetTokenHash: tokenHash,
                passwordResetExpires: { $gt: new Date() }
            })
            .select('+passwordResetTokenHash +passwordResetExpires');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset link'
            });
        }

        const salt = await bcryptjs.genSalt(10);
        user.password = await bcryptjs.hash(newPassword, salt);
        user.passwordResetTokenHash = null;
        user.passwordResetExpires = null;
        user.isFirstLogin = false;
        await user.save();

        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        return res.json({
            success: true,
            message:
                'Password reset successfully. You can log in with your new password.'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export {
    loginUser,
    getCurrentUser,
    changePassword,
    logoutUser,
    updateProfile,
    forgotPassword,
    resetPasswordWithToken
};