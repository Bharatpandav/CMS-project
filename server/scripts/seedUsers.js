import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import userModel from '../models/userModel.js';

dotenv.config();

const seedUsers = [
    {
        name: 'Sample Student',
        email: 'student@sbssu.ac.in',
        password: 'Student@123',
        role: 'student',
        department: 'Computer Science and Engineering',
        rollNumber: 'CSE2023-001',
        semester: 7,
        section: 'A'
    },
    {
        name: 'Sample Advisor',
        email: 'advisor@sbssu.ac.in',
        password: 'Advisor@123',
        role: 'advisor',
        department: 'Computer Science and Engineering'
    },
    {
        name: 'Sample HOD',
        email: 'hod@sbssu.ac.in',
        password: 'Hod@123',
        role: 'hod',
        department: 'Computer Science and Engineering'
    },
    {
        name: 'Sample Dean',
        email: 'dean@sbssu.ac.in',
        password: 'Dean@123',
        role: 'dean'
    },
    {
        name: 'Sample VC',
        email: 'vc@sbssu.ac.in',
        password: 'Vc@123',
        role: 'super_admin'
    }
];

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log('MongoDB connected');

        for (const userData of seedUsers) {
            const existingUser = await userModel.findOne({
                email: userData.email
            });

            if (existingUser) {
                console.log(`Already exists: ${userData.email}`);
                continue;
            }

            const hashedPassword = await bcryptjs.hash(
                userData.password,
                10
            );

            await userModel.create({
                ...userData,
                password: hashedPassword,
                isFirstLogin: true,
                isActive: true
            });

            console.log(`Created: ${userData.email}`);
        }

        console.log('User seeding completed');

    } catch (error) {
        console.error('Seeding failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB disconnected');
    }
};

seedDatabase();