/**
 * HOD Dashboard Controller
 * Provides department-scoped complaint statistics and user counts.
 * Department is always resolved from the authenticated user record —
 * never trusted from client-supplied query parameters.
 */
import Complaint from '../models/complaintModel.js';
import User from '../models/userModel.js';
import { DEPARTMENT_STAFF_ROLES } from '../utils/dashboardUserStatsHelper.js';
import { applyDepartmentUserFilter } from '../utils/departmentUserFilter.js';
import {
    buildHodComplaintCountFilter,
    buildHodComplaintStatsPipeline,
    emptyHodComplaintStats,
    mapHodComplaintAggRow
} from '../utils/hodComplaintStatsHelper.js';

/**
 * GET /api/hod/dashboard-stats
 *
 * Returns:
 *  - complaints: { total, accepted, rejected, pending, resolved }
 *  - users: { activeStudents, activeStaff }
 *  - department: the HOD's own department string
 */
export const getHodDashboardStats = async (req, res) => {
    try {
        if (req.user?.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only HOD accounts can access this endpoint'
            });
        }

        const actor = await User.findById(req.user.id)
            .select('role department isActive')
            .lean();

        if (!actor || !actor.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or not found'
            });
        }

        const department = (actor.department || '').trim();

        if (!department) {
            return res.status(422).json({
                success: false,
                message:
                    'Your HOD account does not have a department assigned. Please contact the system administrator.',
                noDepartment: true
            });
        }

        const [statsAgg, totalCount] = await Promise.all([
            Complaint.aggregate(
                buildHodComplaintStatsPipeline(department, actor._id)
            ),
            Complaint.countDocuments(
                buildHodComplaintCountFilter(department, actor._id)
            )
        ]);

        const complaints = mapHodComplaintAggRow(statsAgg[0], totalCount);

        if (!statsAgg[0] && totalCount === 0) {
            Object.assign(complaints, emptyHodComplaintStats());
            complaints.total = 0;
        }

        const studentQuery = { role: 'student', isActive: true };
        const staffQuery = {
            role: { $in: DEPARTMENT_STAFF_ROLES },
            isActive: true
        };
        applyDepartmentUserFilter(studentQuery, department);
        applyDepartmentUserFilter(staffQuery, department);

        const [activeStudents, activeStaff] = await Promise.all([
            User.countDocuments(studentQuery),
            User.countDocuments(staffQuery)
        ]);

        return res.json({
            success: true,
            department,
            complaints,
            users: {
                activeStudents,
                activeStaff
            }
        });
    } catch (error) {
        console.error('HOD dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};