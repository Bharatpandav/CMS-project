import bcryptjs from 'bcryptjs';
import { parse } from 'csv-parse/sync';

import userModel from '../models/userModel.js';
import generatePassword from '../utils/generatePassword.js';

const validRoles = [
    'student',
    'advisor',
    'hod',
    'dean',
    'super_admin'
];

const allowedRoles = {
    super_admin: [
        'student',
        'advisor',
        'hod',
        'dean',
        'super_admin'
    ],

    dean: [
        'student',
        'advisor',
        'hod'
    ],

    hod: [
        'student',
        'advisor'
    ],

    advisor: [
        'student'
    ],

    student: []
};

const bulkCreateUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'CSV file is required'
            });
        }

        const creatorRole = req.user.role;

        const rolesCreatorCanCreate =
            allowedRoles[creatorRole];

        if (!rolesCreatorCanCreate) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to create users'
            });
        }

        const csvData = req.file.buffer.toString('utf-8');

        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const requiredHeaders = [
            'name',
            'email',
            'role',
            'department',
            'rollNumber',
            'semester',
            'section'
        ];

        const actualHeaders = Object.keys(records[0] || {});

        const missingHeaders = requiredHeaders.filter(
            (header) => !actualHeaders.includes(header)
        );

        if (missingHeaders.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid CSV headers',
                missingHeaders
            });
        }

        if (!records.length) {
            return res.status(400).json({
                success: false,
                message: 'CSV contains no user records'
            });
        }

        const createdUsers = [];
        const failedUsers = [];

        for (let index = 0; index < records.length; index++) {
            const row = records[index];

            const {
                name,
                email,
                role,
                department,
                rollNumber,
                semester,
                section
            } = row;

            const rowNumber = index + 2;

            if (!name || !email || !role) {
                failedUsers.push({
                    row: rowNumber,
                    email: email || '',
                    reason: 'Name, email and role are required'
                });

                continue;
            }

            if (
                role === 'student' &&
                (
                    !department ||
                    !rollNumber ||
                    !semester ||
                    !section
                )
            ) {
                failedUsers.push({
                    row: rowNumber,
                    email: email || '',
                    reason:
                        'Students require department, rollNumber, semester and section'
                });

                continue;
            }

            if (
                (role === 'advisor' || role === 'hod') &&
                !department
            ) {
                failedUsers.push({
                    row: rowNumber,
                    email: email || '',
                    reason:
                        `${role} accounts require department`
                });

                continue;
            }

            if (!validRoles.includes(role)) {
                failedUsers.push({
                    row: rowNumber,
                    email,
                    reason: 'Invalid role'
                });

                continue;
            }

            if (!rolesCreatorCanCreate.includes(role)) {
                failedUsers.push({
                    row: rowNumber,
                    email,
                    reason:
                        `You are not authorized to create a ${role} account`
                });

                continue;
            }

            const normalizedEmail =
                email.toLowerCase().trim();

            const existingUser =
                await userModel.findOne({
                    email: normalizedEmail
                });

            if (existingUser) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        'A user with this email already exists'
                });

                continue;
            }

            const temporaryPassword =
                generatePassword();

            const hashedPassword =
                await bcryptjs.hash(
                    temporaryPassword,
                    10
                );

            const user =
                await userModel.create({
                    name: name.trim(),
                    email: normalizedEmail,
                    password: hashedPassword,
                    role,
                    department:
                        department?.trim() || undefined,
                    rollNumber:
                        rollNumber?.trim() || undefined,
                    semester:
                        semester
                            ? Number(semester)
                            : undefined,
                    section:
                        section?.trim() || undefined,
                    isFirstLogin: true,
                    isActive: true
                });

            createdUsers.push({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                temporaryPassword
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Bulk user import completed',
            summary: {
                total: records.length,
                created: createdUsers.length,
                failed: failedUsers.length
            },
            createdUsers,
            failedUsers
        });

    } catch (error) {
        console.error(
            'Bulk user import error:',
            error
        );

        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export {
    bulkCreateUsers
};