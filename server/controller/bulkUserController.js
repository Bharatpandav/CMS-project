import bcryptjs from 'bcryptjs';
import { parse } from 'csv-parse/sync';

import userModel from '../models/userModel.js';
import generatePassword from '../utils/generatePassword.js';
import generateCredentialCSV from '../utils/generateCredentialCSV.js';

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
                message:
                    'You are not authorized to create users'
            });
        }

        const csvData =
            req.file.buffer.toString('utf-8');

        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        if (!records.length) {
            return res.status(400).json({
                success: false,
                message: 'CSV contains no user records'
            });
        }

        const requiredHeaders = [
            'name',
            'email',
            'role',
            'department',
            'rollNumber',
            'semester',
            'section'
        ];

        const actualHeaders =
            Object.keys(records[0] || {});

        const missingHeaders =
            requiredHeaders.filter(
                (header) =>
                    !actualHeaders.includes(header)
            );

        if (missingHeaders.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid CSV headers',
                missingHeaders
            });
        }

        const createdUsers = [];
        const failedUsers = [];

        /*
         * Track duplicate emails inside the CSV.
         *
         * Map:
         * email -> array of CSV row numbers
         */
        const emailRows = new Map();

        for (
            let index = 0;
            index < records.length;
            index++
        ) {
            const email =
                records[index].email
                    ?.toLowerCase()
                    .trim();

            if (!email) {
                continue;
            }

            const rowNumber = index + 2;

            if (!emailRows.has(email)) {
                emailRows.set(email, []);
            }

            emailRows
                .get(email)
                .push(rowNumber);
        }

        /*
         * Store emails that occur more than once.
         */
        const duplicateEmails = new Set();

        for (
            const [email, rows] of emailRows
        ) {
            if (rows.length > 1) {
                duplicateEmails.add(email);
            }
        }

        /*
         * Process each CSV row.
         */
        for (
            let index = 0;
            index < records.length;
            index++
        ) {
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

            /*
             * Basic required-field validation
             */
            if (!name || !email || !role) {
                failedUsers.push({
                    row: rowNumber,
                    email: email || '',
                    reason:
                        'Name, email and role are required'
                });

                continue;
            }

            const normalizedEmail =
                email.toLowerCase().trim();

            /*
             * Reject duplicate email addresses
             * appearing multiple times in the same CSV.
             */
            if (
                duplicateEmails.has(
                    normalizedEmail
                )
            ) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        'Duplicate email found in CSV'
                });

                continue;
            }

            /*
             * Student-specific required fields
             */
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
                    email: normalizedEmail,
                    reason:
                        'Students require department, rollNumber, semester and section'
                });

                continue;
            }

            /*
             * Advisor and HOD require department
             */
            if (
                (
                    role === 'advisor' ||
                    role === 'hod'
                ) &&
                !department
            ) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        `${role} accounts require department`
                });

                continue;
            }

            /*
             * Student semester validation
             */
            if (role === 'student') {
                const semesterNumber =
                    Number(semester);

                if (
                    !Number.isInteger(
                        semesterNumber
                    ) ||
                    semesterNumber < 1 ||
                    semesterNumber > 8
                ) {
                    failedUsers.push({
                        row: rowNumber,
                        email: normalizedEmail,
                        reason:
                            'Student semester must be an integer between 1 and 8'
                    });

                    continue;
                }
            }

            /*
             * Validate role
             */
            if (!validRoles.includes(role)) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason: 'Invalid role'
                });

                continue;
            }

            /*
             * Check creator's role hierarchy
             */
            if (
                !rolesCreatorCanCreate.includes(
                    role
                )
            ) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        `You are not authorized to create a ${role} account`
                });

                continue;
            }

            /*
             * Check whether email already exists
             * in MongoDB.
             */
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

            /*
             * Generate temporary password
             */
            const temporaryPassword =
                generatePassword();

            /*
             * Hash password before storing
             */
            const hashedPassword =
                await bcryptjs.hash(
                    temporaryPassword,
                    10
                );

            /*
             * Create user
             */
            const user =
                await userModel.create({
                    name: name.trim(),
                    email: normalizedEmail,
                    password: hashedPassword,
                    role,

                    department:
                        department?.trim() ||
                        undefined,

                    rollNumber:
                        rollNumber?.trim() ||
                        undefined,

                    semester:
                        semester
                            ? Number(semester)
                            : undefined,

                    section:
                        section?.trim() ||
                        undefined,

                    isFirstLogin: true,
                    isActive: true
                });

            /*
             * Store generated credentials
             */
            createdUsers.push({
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                temporaryPassword
            });
        }

        /*
         * Generate credential CSV
         */
        const credentialCSV =
            generateCredentialCSV(
                createdUsers
            );

        /*
         * Download credential CSV
         */
        if (
            req.query.downloadCredentials ===
            'true'
        ) {
            res.setHeader(
                'Content-Type',
                'text/csv; charset=utf-8'
            );

            res.setHeader(
                'Content-Disposition',
                'attachment; filename="user-credentials.csv"'
            );

            return res
                .status(201)
                .send(credentialCSV);
        }

        /*
         * Normal JSON response
         */
        return res.status(201).json({
            success: true,
            message:
                'Bulk user import completed',

            summary: {
                total: records.length,
                created: createdUsers.length,
                failed: failedUsers.length
            },

            createdUsers,
            failedUsers,
            credentialCSV
        });

    } catch (error) {
        console.error(
            'Bulk user import error:',
            error
        );

        return res.status(500).json({
            success: false,
            message:
                'Internal server error'
        });
    }
};

export {
    bulkCreateUsers
};