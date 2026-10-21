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
        initialLevel: 'dean',
        isActive: true
    },
    {
        name: 'Infrastructure & Labs',
        description: 'Lab equipment, classroom computers, projectors, network, and physical facilities',
        targetDepartment: 'Estate & Maintenance',
        initialLevel: 'dean',
        isActive: true
    },
    {
        name: 'Examinations & Results',
        description: 'Exam scheduling, admit cards, marks entry, and transcript discrepancies',
        targetDepartment: 'Examination Cell',
        initialLevel: 'dean',
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
        initialLevel: 'dean',
        isActive: true
    },
    {
        name: 'Student Welfare & Discipline',
        description: 'Harassment, ragging, student safety, and general welfare concerns',
        targetDepartment: 'Student Affairs',
        initialLevel: 'dean',
        isActive: true
    }
];

export const ensureDefaultCategories = async () => {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.insertMany(DEFAULT_CATEGORIES);
        }
    } catch (error) {
        console.error('Error ensuring default categories:', error);
    }
};
