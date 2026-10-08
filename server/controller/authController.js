import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userModel from '../models/userModel.js';


const createToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET
    );
};


// Route for user login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if email and password are provided
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


// Route for user logout
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
    logoutUser
};