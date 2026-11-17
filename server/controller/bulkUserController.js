import bcryptjs from 'bcryptjs';
import { parse } from 'csv-parse/sync';

import userModel from '../models/userModel.js';
import {
    buildInitialUserPassword,
    parseDateOfBirthInput
} from '../utils/devCredentialPatterns.js';
import generateCredentialCSV from '../utils/generateCredentialCSV.js';
import escapeRegExp from '../utils/escapeRegExp.js';
import { allowedRoles } from '../middleware/authorizeUserManagement.js';
import { publishUserStatsInvalidation } from '../utils/dashboardEventHub.js';
import {
    createUsersFromValidRecords,
    validateBulkRecords
} from '../utils/bulkUserRowValidation.js';

const activeBulkImports = new Set();

async function loadBulkCreator(req) {
    const creator = await userModel
        .findById(req.user.id)
        .select('role department isActive')
        .lean();

    if (!creator?.isActive) {
        return {
            error: {
                status: 403,
                body: {
                    success: false,
                    message: 'Your account is inactive'
                }
            }
        };
    }

    const rolesCreatorCanCreate = allowedRoles[creator.role];
    if (!rolesCreatorCanCreate?.length) {
        return {
            error: {
                status: 403,
                body: {
                    success: false,
                    message: 'You are not authorized to create users'
                }
            }
        };
    }

    if (creator.role === 'hod' && !(creator.department || '').trim()) {
        return {
            error: {
                status: 422,
                body: {
                    success: false,
                    message:
                        'Your HOD account has no department assigned. Cannot import users.'
                }
            }
        };
    }

    return { creator };
}

const validRoles = [
    'student',
    'advisor',
    'hod',
    'dean',
    'super_admin'
];

const bulkCreateUsers = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'CSV file is required'
            });
        }

        const creator = await userModel
            .findById(req.user.id)
            .select('role department isActive')
            .lean();

        if (!creator?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account is inactive'
            });
        }

        const creatorRole = creator.role;

        const rolesCreatorCanCreate =
            allowedRoles[creatorRole];

        if (!rolesCreatorCanCreate || rolesCreatorCanCreate.length === 0) {
            return res.status(403).json({
                success: false,
                message:
                    'You are not authorized to create users'
            });
        }

        const hodDepartment =
            creatorRole === 'hod'
                ? (creator.department || '').trim()
                : '';

        if (creatorRole === 'hod' && !hodDepartment) {
            return res.status(422).json({
                success: false,
                message:
                    'Your HOD account has no department assigned. Cannot import users.'
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
            'section',
            'dateOfBirth'
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
        const bulkAffectedDepartments = [];

        /*
         * Track duplicate emails and duplicate student roll numbers inside the CSV.
         */
        const emailRows = new Map();
        const rollRows = new Map();

        for (
            let index = 0;
            index < records.length;
            index++
        ) {
            const rowNumber = index + 2;
            const email =
                records[index].email
                    ?.toLowerCase()
                    .trim();

            if (email) {
                if (!emailRows.has(email)) {
                    emailRows.set(email, []);
                }
                emailRows.get(email).push(rowNumber);
            }

            const role = records[index].role?.trim();
            const roll = records[index].rollNumber?.trim();
            if (role === 'student' && roll) {
                const lowerRoll = roll.toLowerCase();
                if (!rollRows.has(lowerRoll)) {
                    rollRows.set(lowerRoll, []);
                }
                rollRows.get(lowerRoll).push(rowNumber);
            }
        }

        const duplicateEmails = new Set();
        for (const [email, rows] of emailRows) {
            if (rows.length > 1) {
                duplicateEmails.add(email);
            }
        }

        const duplicateRollNumbers = new Set();
        for (const [roll, rows] of rollRows) {
            if (rows.length > 1) {
                duplicateRollNumbers.add(roll);
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
                section,
                dateOfBirth
            } = row;

            const rowNumber = index + 2;

            let effectiveDepartment = department?.trim() || '';

            if (creatorRole === 'hod') {
                if (!['student', 'advisor'].includes(role?.trim())) {
                    failedUsers.push({
                        row: rowNumber,
                        email: email || '',
                        reason:
                            'HOD accounts may only import Student and Advisor users'
                    });
                    continue;
                }
                effectiveDepartment = hodDepartment;
            }

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
             * Reject duplicate email addresses appearing multiple times in the same CSV.
             */
            if (duplicateEmails.has(normalizedEmail)) {
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
                    !effectiveDepartment ||
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

            const trimmedRoll = rollNumber?.trim();

            /*
             * Reject duplicate student roll numbers appearing multiple times in the same CSV.
             */
            if (
                role === 'student' &&
                trimmedRoll &&
                duplicateRollNumbers.has(trimmedRoll.toLowerCase())
            ) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        'Duplicate roll number / URN found in CSV'
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
                !effectiveDepartment
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
             * Check whether email already exists in MongoDB.
             */
            const existingEmailUser =
                await userModel.findOne({
                    email: normalizedEmail
                });

            if (existingEmailUser) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        'A user with this email already exists'
                });

                continue;
            }

            /*
             * Check whether student roll number / URN already exists in MongoDB.
             */
            if (role === 'student' && trimmedRoll) {
                const existingRollUser =
                    await userModel.findOne({
                        rollNumber: {
                            $regex: new RegExp(
                                `^${escapeRegExp(trimmedRoll)}$`,
                                'i'
                            )
                        }
                    });

                if (existingRollUser) {
                    failedUsers.push({
                        row: rowNumber,
                        email: normalizedEmail,
                        reason:
                            'A user with this roll number / URN already exists'
                    });

                    continue;
                }
            }

            let parsedDateOfBirth = null;
            if (role !== 'student') {
                if (!dateOfBirth?.trim()) {
                    failedUsers.push({
                        row: rowNumber,
                        email: normalizedEmail,
                        reason:
                            'Staff and admin accounts require dateOfBirth (YYYY-MM-DD)'
                    });
                    continue;
                }
                parsedDateOfBirth = parseDateOfBirthInput(dateOfBirth);
                if (!parsedDateOfBirth) {
                    failedUsers.push({
                        row: rowNumber,
                        email: normalizedEmail,
                        reason: 'Invalid dateOfBirth — use YYYY-MM-DD'
                    });
                    continue;
                }
            }

            let temporaryPassword;
            try {
                temporaryPassword = buildInitialUserPassword({
                    role,
                    name: name.trim(),
                    rollNumber: trimmedRoll,
                    dateOfBirth: parsedDateOfBirth
                });
            } catch (passwordError) {
                failedUsers.push({
                    row: rowNumber,
                    email: normalizedEmail,
                    reason:
                        passwordError.message ||
                        'Could not generate initial password'
                });
                continue;
            }

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
                        effectiveDepartment ||
                        undefined,

                    rollNumber:
                        trimmedRoll ||
                        undefined,

                    semester:
                        semester
                            ? Number(semester)
                            : undefined,

                    section:
                        section?.trim() ||
                        undefined,

                    dateOfBirth: parsedDateOfBirth || undefined,

                    isFirstLogin: true,
                    isActive: true
                });

            /*
             * Determine role-specific login identifier:
             * Students use rollNumber (URN); staff use email
             */
            const loginIdentifier =
                user.role === 'student'
                    ? user.rollNumber
                    : user.email;

            /*
             * Store generated credentials
             */
            createdUsers.push({
                id: user._id,
                name: user.name,
                loginIdentifier,
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber || undefined,
                temporaryPassword
            });

            const dept = (user.department || '').trim();
            if (dept && !bulkAffectedDepartments.includes(dept)) {
                bulkAffectedDepartments.push(dept);
            }
        }

        /*
         * Generate credential CSV with login identifiers
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

            publishUserStatsInvalidation(
                bulkAffectedDepartments.length
                    ? bulkAffectedDepartments
                    : []
            );

            return res
                .status(201)
                .send(credentialCSV);
        }

        publishUserStatsInvalidation(
            bulkAffectedDepartments.length
                ? bulkAffectedDepartments
                : []
        );

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

export const bulkValidateUsers = async (req, res) => {
    try {
        const loaded = await loadBulkCreator(req);
        if (loaded.error) {
            return res.status(loaded.error.status).json(loaded.error.body);
        }

        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'records array is required'
            });
        }

        const validation = await validateBulkRecords(
            records,
            loaded.creator
        );

        return res.json({
            success: true,
            validated: true,
            ...validation
        });
    } catch (error) {
        console.error('Bulk validate error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const bulkImportValidatedUsers = async (req, res) => {
    const actorId = req.user?.id;
    if (!actorId) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
    }

    if (activeBulkImports.has(actorId)) {
        return res.status(429).json({
            success: false,
            message:
                'An import is already in progress. Wait for it to finish before submitting again.'
        });
    }

    activeBulkImports.add(actorId);

    try {
        const loaded = await loadBulkCreator(req);
        if (loaded.error) {
            return res.status(loaded.error.status).json(loaded.error.body);
        }

        const { records } = req.body;
        if (!Array.isArray(records) || records.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid records submitted for import'
            });
        }

        const revalidation = await validateBulkRecords(
            records,
            loaded.creator
        );

        const allStillValid =
            revalidation.validRecords.length === records.length &&
            revalidation.invalidCount === 0 &&
            revalidation.duplicateCount === 0;

        if (!allStillValid) {
            return res.status(409).json({
                success: false,
                message:
                    'One or more records failed final validation. Refresh the preview and try again.',
                validation: revalidation
            });
        }

        const totalSubmitted = records.length;
        const { createdUsers, failedUsers, bulkAffectedDepartments } =
            await createUsersFromValidRecords(revalidation.validRecords);

        const credentialCSV = generateCredentialCSV(createdUsers);

        publishUserStatsInvalidation(
            bulkAffectedDepartments.length
                ? bulkAffectedDepartments
                : []
        );

        return res.status(201).json({
            success: true,
            message: 'Bulk import completed',
            summary: {
                totalSubmitted,
                created: createdUsers.length,
                failed: failedUsers.length,
                skippedInvalid: Number(req.body.skippedInvalid) || 0
            },
            createdUsers,
            failedUsers,
            credentialCSV
        });
    } catch (error) {
        console.error('Bulk import validated error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    } finally {
        activeBulkImports.delete(actorId);
    }
};

export { bulkCreateUsers };