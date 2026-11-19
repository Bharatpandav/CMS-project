/**
 * Dean Dashboard Controller
 * Complaint metrics use the same list scope as getListFilterForRole(dean).
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

export const getDeanDashboardStats = async (req, res) => {
    try {
        if (req.user?.role !== 'dean') {
            return res.status(403).json({
                success: false,
                message: 'Only Dean accounts can access this endpoint'
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
            'dean',
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
        console.error('Dean dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};