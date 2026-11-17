/**
 * Student dashboard — complaint stats for complaints raisedBy the authenticated student only.
 */
import mongoose from 'mongoose';
import Complaint from '../models/complaintModel.js';
import User from '../models/userModel.js';
import {
    buildScopedComplaintStatsPipeline,
    emptyHodComplaintStats,
    mapHodComplaintAggRow
} from '../utils/hodComplaintStatsHelper.js';

/**
 * GET /api/student/dashboard-stats
 */
export const getStudentDashboardStats = async (req, res) => {
    try {
        if (req.user?.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Only student accounts can access this endpoint'
            });
        }

        const studentId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid student account'
            });
        }

        const actor = await User.findById(studentId)
            .select('role isActive')
            .lean();

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive or not found'
            });
        }

        const raisedByFilter = {
            raisedBy: new mongoose.Types.ObjectId(studentId)
        };

        const [statsAgg, totalCount] = await Promise.all([
            Complaint.aggregate(
                buildScopedComplaintStatsPipeline(raisedByFilter)
            ),
            Complaint.countDocuments(raisedByFilter)
        ]);

        let complaints = mapHodComplaintAggRow(statsAgg[0], totalCount);

        if (!statsAgg[0] && totalCount === 0) {
            complaints = { ...emptyHodComplaintStats(), total: 0 };
        }

        return res.json({
            success: true,
            complaints
        });
    } catch (error) {
        console.error('Student dashboard stats error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};