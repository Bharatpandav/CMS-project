import mongoose from 'mongoose';

const complaintLogSchema = new mongoose.Schema(
    {
        complaint: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Complaint',
            required: true,
            index: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        actorRole: {
            type: String,
            default: null
        },
        previousStatus: {
            type: String,
            default: null
        },
        newStatus: {
            type: String,
            default: null
        },
        previousAssignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        newAssignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        level: {
            type: String,
            enum: ['dean', 'hod', 'advisor', 'vc', 'super_admin']
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        },
        action: {
            type: String,
            enum: [
                'submitted',
                'assigned',
                'accepted',
                'rejected',
                'escalated',
                'resolved',
                'returned',
                'reopened'
            ]
        },
        remarks: {
            type: String
        }
    },
    { timestamps: true }
);

const ComplaintLog =
    mongoose.models.ComplaintLog ||
    mongoose.model('ComplaintLog', complaintLogSchema);

export default ComplaintLog;