/**
 * Advisor dashboard — complaint metrics scoped to assignments (currentAssignee).
 */
import Complaint from '../models/complaintModel.js';
import User from '../models/userModel.js';
import { getListFilterForRole } from '../utils/complaintWorkflowHelper.js';
import {
    buildScopedComplaintStatsPipeline,
    emptyHodComplaintStats,
    mapHodComplaintAggRow
} from '../utils/hodComplaintStatsHelper.js';

export const getAdvisorDashboardStats = async (req, res) => {
    try {
        if (req.user?.role !== 'advisor') {
            return res.status(403).json({
                success: false,
                message: 'Only Advisor accounts can access this endpoint'
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
            'advisor',
            actor._id,
            actor.department
        );

        const [statsAgg, totalCount] = await Promise.all([
            Complaint.aggregate(
                buildScopedComplaintStatsPipeline(complaintMatch)
            ),
            Complaint.countDocuments(complaintMatch)
        ]);

        const complaints = mapHodComplaintAggRow(statsAgg[0], totalCount);

        if (!statsAgg[0] && totalCount === 0) {
            Object.assign(complaints, emptyHodComplaintStats());
            complaints.total = 0;
        }

        const department = (actor.department || '').trim();

        return res.json({
            success: true,
            department: department || null,
            complaints
        });
    } catch (error) {
        console.error('Advisor dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};