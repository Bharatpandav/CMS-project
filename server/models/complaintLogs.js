import mongoose from 'mongoose';

const complaintLogSchema = new mongoose.Schema({
    complaint: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
        required: true,
        index: true,
    },
    level: { type: String, enum: ['dean', 'hod', 'advisor'] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: {
        type: String,
        enum: ['assigned', 'accepted', 'rejected', 'escalated', 'resolved'],
    },
    remarks: { type: String },
}, { timestamps: true });

export default mongoose.model('ComplaintLog', complaintLogSchema);