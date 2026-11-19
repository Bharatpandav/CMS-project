import mongoose from 'mongoose';

const complaintSequenceSchema = new mongoose.Schema(
    {
        rollNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        seq: {
            type: Number,
            required: true,
            min: 0,
            default: 0
        }
    },
    { timestamps: true }
);

const ComplaintSequence =
    mongoose.models.ComplaintSequence ||
    mongoose.model('ComplaintSequence', complaintSequenceSchema);

export default ComplaintSequence;
