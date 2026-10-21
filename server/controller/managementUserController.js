import { Parser } from 'json2csv';
import userModel from '../models/userModel.js';
import escapeRegExp from '../utils/escapeRegExp.js';
import { assertCanManageTargetRole } from '../middleware/authorizeManagement.js';

const publicUserFields =
    'name email role department rollNumber semester section isActive isFirstLogin createdAt updatedAt';

const buildListFilter = (query) => {
    const filter = {};
    const { role, department, status, search } = query;

    if (role === 'staff') {
        filter.role = {
            $in: ['advisor', 'hod', 'dean', 'super_admin']
        };
    } else if (role) {
        filter.role = role;
    }
    if (department) {
        filter.department = department;
    }
    if (status === 'active') {
        filter.isActive = true;
    } else if (status === 'inactive') {
        filter.isActive = false;
    }

    if (search && search.trim()) {
        const term = search.trim();
        const regex = new RegExp(escapeRegExp(term), 'i');
        filter.$or = [
            { name: regex },
            { email: regex },
            { rollNumber: regex },
            { department: regex }
        ];
    }

    return filter;
};

const getUserStats = async (req, res) => {
    try {
        const [total, students, staff, active, inactive] = await Promise.all([
            userModel.countDocuments(),
            userModel.countDocuments({ role: 'student' }),
            userModel.countDocuments({
                role: { $in: ['advisor', 'hod', 'dean', 'super_admin'] }
            }),
            userModel.countDocuments({ isActive: true }),
            userModel.countDocuments({ isActive: false })
        ]);

        return res.json({
            success: true,
            stats: {
                totalUsers: total,
                totalStudents: students,
                totalStaff: staff,
                activeAccounts: active,
                inactiveAccounts: inactive
            }
        });
    } catch (error) {
        console.error('User stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const listUsers = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const allowedSort = [
            'createdAt',
            'name',
            'email',
            'role',
            'department'
        ];
        const sortField = allowedSort.includes(sortBy) ? sortBy : 'createdAt';

        const filter = buildListFilter(req.query);

        const [users, total] = await Promise.all([
            userModel
                .find(filter)
                .select(publicUserFields)
                .sort({ [sortField]: sortOrder })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            userModel.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('List users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await userModel
            .findById(req.params.id)
            .select(publicUserFields)
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateUser = async (req, res) => {
    try {
        const actorRole = req.user.role;
        const actorId = req.user.id;
        const target = await userModel.findById(req.params.id);

        if (!target) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (target._id.toString() === actorId) {
            if (req.body.role && req.body.role !== target.role) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot change your own role'
                });
            }
            if (
                Object.prototype.hasOwnProperty.call(req.body, 'isActive') &&
                req.body.isActive !== target.isActive
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'You cannot deactivate your own account'
                });
            }
        }

        const nextRole = req.body.role || target.role;

        if (!assertCanManageTargetRole(actorRole, nextRole)) {
            return res.status(403).json({
                success: false,
                message: `You are not authorized to assign role ${nextRole}`
            });
        }

        if (target.role !== nextRole) {
            if (!assertCanManageTargetRole(actorRole, target.role)) {
                return res.status(403).json({
                    success: false,
                    message:
                        'You are not authorized to modify this user account'
                });
            }
        }

        const updates = {};
        const allowed = [
            'name',
            'email',
            'role',
            'department',
            'rollNumber',
            'semester',
            'section'
        ];

        for (const field of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                updates[field] = req.body[field];
            }
        }

        if (updates.email) {
            updates.email = updates.email.toLowerCase().trim();
            const clash = await userModel.findOne({
                email: updates.email,
                _id: { $ne: target._id }
            });
            if (clash) {
                return res.status(409).json({
                    success: false,
                    message: 'Email already in use'
                });
            }
        }

        if (updates.rollNumber) {
            const trimmed = updates.rollNumber.trim();
            const clash = await userModel.findOne({
                rollNumber: {
                    $regex: new RegExp(`^${escapeRegExp(trimmed)}$`, 'i')
                },
                _id: { $ne: target._id }
            });
            if (clash) {
                return res.status(409).json({
                    success: false,
                    message: 'URN / roll number already in use'
                });
            }
            updates.rollNumber = trimmed;
        }

        Object.assign(target, updates);
        await target.save();

        const user = await userModel
            .findById(target._id)
            .select(publicUserFields)
            .lean();

        return res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const setUserStatus = async (req, res) => {
    try {
        const actorId = req.user.id;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive boolean is required'
            });
        }

        const target = await userModel.findById(req.params.id);

        if (!target) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (target._id.toString() === actorId) {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own account status'
            });
        }

        if (!assertCanManageTargetRole(req.user.role, target.role)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to modify this user'
            });
        }

        target.isActive = isActive;
        await target.save();

        const user = await userModel
            .findById(target._id)
            .select(publicUserFields)
            .lean();

        return res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'}`,
            user
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const exportUsersCsv = async (req, res) => {
    try {
        const filter = buildListFilter(req.query);
        const users = await userModel
            .find(filter)
            .select(publicUserFields)
            .sort({ createdAt: -1 })
            .lean();

        const rows = users.map((u) => ({
            name: u.name,
            urn: u.rollNumber || '',
            email: u.email,
            role: u.role,
            department: u.department || '',
            semester: u.semester ?? '',
            section: u.section || '',
            status: u.isActive ? 'active' : 'inactive',
            createdAt: u.createdAt
        }));

        const parser = new Parser();
        const csv = parser.parse(rows);

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="users-export.csv"'
        );
        return res.send(csv);
    } catch (error) {
        console.error('Export users error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export {
    getUserStats,
    listUsers,
    getUserById,
    updateUser,
    setUserStatus,
    exportUsersCsv
};
