import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
    raisedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    raisedByName: { type: String, required: true },

    isGroupComplaint: { type: Boolean, default: false },
    groupMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    title: { type: String, required: true },
    description: { type: String, required: true },
    department: { type: String, required: true, index: true },
    images: [{ type: String }],

    initialLevel: { type: String, enum: ['hod', 'dean'], required: true },
    currentLevel: {
        type: String,
        enum: ['dean', 'hod', 'advisor', 'vc'],
        required: true,
        index: true,
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null, // kisne assign kiya — timeout pe wapis is ke paas bhejna hai
    },
    currentAssignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },

    status: {
        type: String,
        enum: ['pending', 'assigned', 'accepted', 'rejected', 'resolved', 'escalated'],
        default: 'pending',
        index: true,
    },
    deadline: {
        type: Date, // overall complaint ki max 2-month deadline
        required: true,
    },
    levelDeadline: {
        type: Date, // current level ki deadline (Dean: 1 month, HOD/Advisor: 2 weeks)
        required: true,
    },
    
    Date: { type: Date, required: true },

    undertaking: { type: Boolean, required: true },
    
    resolvedAt: { type: Date, default: null },
}, { timestamps: true });

// Compound indexes — dashboard ke common queries fast karne ke liye
complaintSchema.index({ currentLevel: 1, status: 1 });
complaintSchema.index({ currentAssignee: 1, status: 1 });

export default mongoose.model('Complaint', complaintSchema);