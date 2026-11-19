import Category from '../models/categoryModel.js';

export const DEFAULT_CATEGORIES = [
    {
        name: 'Academic Affairs',
        description: 'Issues regarding coursework, lectures, syllabus, and academic advising',
        targetDepartment: 'Academic Affairs',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Hostel & Mess',
        description: 'Room maintenance, mess food quality, water, electricity, and sanitation in hostels',
        targetDepartment: 'Hostel Affairs',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Infrastructure & Labs',
        description: 'Lab equipment, classroom computers, projectors, network, and physical facilities',
        targetDepartment: 'Estate & Maintenance',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Examinations & Results',
        description: 'Exam scheduling, admit cards, marks entry, and transcript discrepancies',
        targetDepartment: 'Examination Cell',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Library & Digital Resources',
        description: 'Book availability, digital library access, study spaces, and library cards',
        targetDepartment: 'Library',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Fee & Accounts',
        description: 'Fee payment receipts, refund claims, scholarship processing, and dues',
        targetDepartment: 'Accounts & Finance',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Student Welfare & Discipline',
        description: 'Harassment, ragging, student safety, and general welfare concerns',
        targetDepartment: 'Student Affairs',
        initialLevel: 'hod',
        isActive: true
    },
    {
        name: 'Other',
        description: 'Complaint category not listed above — specify your own',
        targetDepartment: 'Academic Affairs',
        initialLevel: 'hod',
        isActive: true
    }
];

export const OTHER_CATEGORY_NAME = 'Other';

export const ensureDefaultCategories = async () => {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.insertMany(DEFAULT_CATEGORIES);
            return;
        }

        const other = DEFAULT_CATEGORIES.find(
            (row) => row.name === OTHER_CATEGORY_NAME
        );
        if (other) {
            await Category.updateOne(
                { name: OTHER_CATEGORY_NAME },
                { $setOnInsert: other },
                { upsert: true }
            );
        }

        await Category.updateMany(
            { initialLevel: { $ne: 'hod' } },
            { $set: { initialLevel: 'hod' } }
        );
    } catch (error) {
        console.error('Error ensuring default categories:', error);
    }
};
