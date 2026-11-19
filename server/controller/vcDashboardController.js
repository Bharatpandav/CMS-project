/**
 * VC Dashboard Controller
 * Complaint metrics use the same list scope as getListFilterForRole(super_admin).
 * User counts are institution-wide (dean / VC management stats scope).
 */
import Complaint from '../models/complaintModel.js';
import User from '../models/userModel.js';
import { getListFilterForRole } from '../utils/complaintWorkflowHelper.js';
import {
    countDashboardUserStats,
    resolveUserStatsScope
} from '../utils/dashboardUserStatsHelper.js';
import {
    buildScopedComplaintStatsPipeline,
    emptyHodComplaintStats,
    mapHodComplaintAggRow
} from '../utils/hodComplaintStatsHelper.js';

/**
 * GET /api/vc/dashboard-stats
 */
export const getVcDashboardStats = async (req, res) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Vice Chancellor accounts can access this endpoint'
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

        const complaintMatch = getListFilterForRole(
            'super_admin',
            actor._id,
            actor.department
        );

        const [statsAgg, totalCount, userStats] = await Promise.all([
            Complaint.aggregate(
                buildScopedComplaintStatsPipeline(complaintMatch)
            ),
            Complaint.countDocuments(complaintMatch),
            countDashboardUserStats(resolveUserStatsScope(actor))
        ]);

        const complaints = mapHodComplaintAggRow(statsAgg[0], totalCount);

        if (!statsAgg[0] && totalCount === 0) {
            Object.assign(complaints, emptyHodComplaintStats());
            complaints.total = 0;
        }

        return res.json({
            success: true,
            complaints,
            users: {
                activeStudents: userStats.activeStudents ?? 0,
                activeStaff: userStats.activeStaff ?? 0
            }
        });
    } catch (error) {
        console.error('VC dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};