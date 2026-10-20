import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        rollNumber: {
            type: String,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);

const studentProfileSnapshotSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        rollNumber: { type: String, default: '' },
        department: { type: String, default: '' },
        semester: { type: Number, default: null },
        section: { type: String, default: '' },
        programme: { type: String, default: '' },
        batch: { type: String, default: '' },
        advisor: { type: String, default: '' }
    },
    { _id: false }
);

const complaintSchema = new mongoose.Schema(
    {
        raisedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        raisedByName: { type: String, required: true },
        studentProfile: {
            type: studentProfileSnapshotSchema,
            required: true
        },

        // Complaint Categorization & Routing
        category: { type: String, required: true, trim: true },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null
        },
        department: { type: String, required: true, index: true },

        title: { type: String, required: true, trim: true },
        description: { type: String, required: true, trim: true },
        location: { type: String, trim: true, default: '' },
        incidentDate: { type: Date, default: null },
        preferredResolution: { type: String, trim: true, default: '' },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
            index: true
        },

        // Complaint Type & Visibility
        complaintType: {
            type: String,
            enum: ['solo', 'group'],
            default: 'solo',
            index: true
        },
        visibility: {
            type: String,
            enum: ['public', 'private'],
            default: 'public',
            index: true
        },

        // Backward compatibility flags
        isGroupComplaint: { type: Boolean, default: false },
        groupMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'user' }],

        // Confirmed Group Participants
        participants: [participantSchema],
        participantCount: { type: Number, default: 1 },

        // Attachments
        images: [{ type: String }],
        attachments: [
            {
                url: { type: String, required: true },
                filename: { type: String, default: '' },
                fileType: { type: String, default: '' }
            }
        ],

        // Administrative Workflow & Escalation
        initialLevel: { type: String, enum: ['hod', 'dean'], required: true },
        currentLevel: {
            type: String,
            enum: ['dean', 'hod', 'advisor', 'vc'],
            required: true,
            index: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null
        },
        currentAssignee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            default: null,
            index: true
        },

        status: {
            type: String,
            enum: [
                'pending',
                'assigned',
                'accepted',
                'rejected',
                'resolved',
                'escalated'
            ],
            default: 'pending',
            index: true
        },
        deadline: {
            type: Date,
            required: true
        },
        levelDeadline: {
            type: Date,
            required: true
        },

        Date: { type: Date, required: true },
        undertaking: { type: Boolean, required: true },
        resolvedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

// Compound indexes
complaintSchema.index({ currentLevel: 1, status: 1 });
complaintSchema.index({ currentAssignee: 1, status: 1 });
complaintSchema.index({ visibility: 1, status: 1 });
complaintSchema.index({ department: 1, visibility: 1 });
complaintSchema.index({ 'participants.student': 1 });

const Complaint =
    mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);

export default Complaint;