import mongoose from 'mongoose';

const complaintLogSchema = new mongoose.Schema(
    {
        complaint: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Complaint',
            required: true,
            index: true
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
            enum: ['assigned', 'accepted', 'rejected', 'escalated', 'resolved']
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