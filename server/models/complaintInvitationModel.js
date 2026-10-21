import mongoose from 'mongoose';

const complaintInvitationSchema = new mongoose.Schema(
    {
        complaint: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Complaint',
            required: true,
            index: true
        },
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        studentName: {
            type: String,
            required: true
        },
        studentRollNumber: {
            type: String,
            required: true,
            index: true
        },
        invitedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined', 'cancelled'],
            default: 'pending',
            index: true
        },
        respondedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

// Prevent duplicate invitations for the same student on the same complaint
complaintInvitationSchema.index({ complaint: 1, student: 1 }, { unique: true });

const ComplaintInvitation =
    mongoose.models.ComplaintInvitation ||
    mongoose.model('ComplaintInvitation', complaintInvitationSchema);

export default ComplaintInvitation;
