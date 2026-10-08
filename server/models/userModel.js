import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: [
                'student',
                'advisor',
                'hod',
                'dean',
                'super_admin'
            ],
            required: true
        },

        department: {
            type: String,
            trim: true
        },

        rollNumber: {
            type: String,
            trim: true,
            sparse: true
        },

        semester: {
            type: Number
        },

        section: {
            type: String,
            trim: true
        },

        isFirstLogin: {
            type: Boolean,
            default: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true,
        minimize: false
    }
);

const userModel =
    mongoose.models.user ||
    mongoose.model('user', userSchema);

export default userModel;