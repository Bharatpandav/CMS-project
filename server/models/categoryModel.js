import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        description: {
            type: String,
            trim: true,
            default: ''
        },
        targetDepartment: {
            type: String,
            required: true,
            trim: true
        },
        initialLevel: {
            type: String,
            enum: ['hod', 'dean'],
            default: 'hod'
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

const Category =
    mongoose.models.Category ||
    mongoose.model('Category', categorySchema);

export default Category;
