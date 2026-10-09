const allowedRoles = {
    super_admin: [
        'student',
        'advisor',
        'hod',
        'dean',
        'super_admin'
    ],

    dean: [
        'student',
        'advisor',
        'hod'
    ],

    hod: [
        'student',
        'advisor'
    ],

    advisor: [
        'student'
    ],

    student: []
};

const authorizeUserManagement = (req, res, next) => {
    const creatorRole = req.user.role;
    const requestedRole = req.body.role;

    const rolesCreatorCanCreate =
        allowedRoles[creatorRole];

    if (!rolesCreatorCanCreate) {
        return res.status(403).json({
            success: false,
            message: 'You are not authorized to create users'
        });
    }

    if (!requestedRole) {
        return res.status(400).json({
            success: false,
            message: 'Role is required'
        });
    }

    if (!rolesCreatorCanCreate.includes(requestedRole)) {
        return res.status(403).json({
            success: false,
            message:
                `You are not authorized to create a ${requestedRole} account`
        });
    }

    next();
};

export default authorizeUserManagement;