import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user',
            required: true,
            index: true
        },
        title: { type: String, required: true, trim: true },
        message: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: ['complaint', 'system', 'invitation'],
            default: 'system'
        },
        relatedComplaint: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Complaint',
            default: null
        },
        read: { type: Boolean, default: false, index: true }
    },
    { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

const Notification =
    mongoose.models.Notification ||
    mongoose.model('Notification', notificationSchema);

export default Notification;
