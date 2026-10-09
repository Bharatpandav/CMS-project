import userModel from '../models/userModel.js';

const requirePasswordChange = async (req, res, next) => {
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
                message: 'Account is inactive. Contact system management.'
            });
        }

        if (user.isFirstLogin) {
            return res.status(403).json({
                success: false,
                message: 'Password change required before accessing this resource',
                code: 'PASSWORD_CHANGE_REQUIRED'
            });
        }

        next();

    } catch (error) {
        console.error('Password change enforcement error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export default requirePasswordChange;