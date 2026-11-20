import bcryptjs from 'bcryptjs';
import userModel from '../models/userModel.js';
import escapeRegExp from '../utils/escapeRegExp.js';
import { validateEmailAddress } from '../utils/emailValidation.js';
import { allowedRoles } from '../middleware/authorizeUserManagement.js';
import {
    buildInitialUserPassword,
    parseDateOfBirthInput
} from './devCredentialPatterns.js';

const VALID_ROLES = [
    'student',
    'advisor',
    'hod',
    'dean',
    'super_admin'
];

function normalizeRecord(raw, rowNumber) {
    const keys = [
        'name',
        'email',
        'role',
        'department',
        'rollNumber',
        'semester',
        'section',
        'dateOfBirth'
    ];
    const record = { rowNumber };
    for (const key of keys) {
        record[key] =
            raw[key] == null || raw[key] === undefined
                ? ''
                : String(raw[key]).trim();
    }
    return record;
}

/**
 * Full bulk validation (file duplicates + database checks).
 * @param {object[]} records - raw row objects from client
 * @param {{ role: string, department?: string, isActive?: boolean }} creator
 */
export async function validateBulkRecords(records, creator) {
    const creatorRole = creator?.role;
    const rolesCreatorCanCreate = allowedRoles[creatorRole] || [];
    const hodDepartment =
        creatorRole === 'hod' ? (creator.department || '').trim() : '';

    const normalized = records.map((row, index) =>
        normalizeRecord(row, row.rowNumber ?? index + 2)
    );

    const emailRows = new Map();
    const rollRows = new Map();

    for (const row of normalized) {
        const email = row.email?.toLowerCase();
        if (email) {
            if (!emailRows.has(email)) emailRows.set(email, []);
            emailRows.get(email).push(row.rowNumber);
        }
        if (row.role === 'student' && row.rollNumber) {
            const roll = row.rollNumber.toLowerCase();
            if (!rollRows.has(roll)) rollRows.set(roll, []);
            rollRows.get(roll).push(row.rowNumber);
        }
    }

    const duplicateEmails = new Set(
        [...emailRows.entries()]
            .filter(([, nums]) => nums.length > 1)
            .map(([e]) => e)
    );
    const duplicateRolls = new Set(
        [...rollRows.entries()]
            .filter(([, nums]) => nums.length > 1)
            .map(([r]) => r)
    );

    const emailsToCheck = [
        ...new Set(
            normalized
                .map((r) => r.email?.toLowerCase())
                .filter(Boolean)
        )
    ];
    const rollsToCheck = [
        ...new Set(
            normalized
                .filter((r) => r.role === 'student' && r.rollNumber)
                .map((r) => r.rollNumber.trim())
        )
    ];

    const existingByEmail = emailsToCheck.length
        ? await userModel
              .find({ email: { $in: emailsToCheck } })
              .select('email')
              .lean()
        : [];

    const registeredEmails = new Set(
        existingByEmail.map((u) => u.email.toLowerCase())
    );

    const registeredRolls = new Set();
    if (rollsToCheck.length) {
        await Promise.all(
            rollsToCheck.map(async (roll) => {
                const found = await userModel
                    .findOne({
                        rollNumber: {
                            $regex: new RegExp(
                                `^${escapeRegExp(roll)}$`,
                                'i'
                            )
                        }
                    })
                    .select('rollNumber')
                    .lean();
                if (found?.rollNumber) {
                    registeredRolls.add(found.rollNumber.toLowerCase());
                }
            })
        );
    }

    const rows = [];
    const validRecords = [];
    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (const row of normalized) {
        const reasons = [];
        let isInFileDuplicate = false;

        if (!row.name?.trim()) {
            reasons.push('Missing required name');
        }

        if (!row.email || !row.role) {
            if (!row.email) reasons.push('Missing required email');
            if (!row.role) reasons.push('Missing required role');
        }

        const emailCheck = validateEmailAddress(row.email);
        let normalizedEmail = '';
        if (!emailCheck.ok) {
            if (row.email) reasons.push('Invalid email format');
        } else {
            normalizedEmail = emailCheck.email;
            if (duplicateEmails.has(normalizedEmail)) {
                reasons.push('Duplicate email in uploaded file');
                isInFileDuplicate = true;
            }
            if (registeredEmails.has(normalizedEmail)) {
                reasons.push('Email already registered');
            }
        }

        const role = row.role?.trim();
        if (role && !VALID_ROLES.includes(role)) {
            reasons.push('Invalid role');
        } else if (role && !rolesCreatorCanCreate.includes(role)) {
            reasons.push(`Not authorized to create ${role} accounts`);
        }

        if (creatorRole === 'hod') {
            if (role && !['student', 'advisor'].includes(role)) {
                reasons.push(
                    'HOD may only import Student and Advisor accounts'
                );
            }
            if (!hodDepartment) {
                reasons.push('HOD department is not configured');
            }
        }

        if (creatorRole === 'advisor' && role && role !== 'student') {
            reasons.push('Advisor may only import Student accounts');
        }

        let effectiveDepartment = row.department?.trim() || '';
        if (creatorRole === 'hod' && hodDepartment) {
            effectiveDepartment = hodDepartment;
        }

        const trimmedRoll = row.rollNumber?.trim();

        if (role === 'student') {
            if (
                !effectiveDepartment ||
                !trimmedRoll ||
                !row.semester ||
                !row.section
            ) {
                reasons.push(
                    creatorRole === 'hod'
                        ? 'Students require roll number, semester and section'
                        : 'Students require department, roll number, semester and section'
                );
            }
            const semesterNumber = Number(row.semester);
            if (
                row.semester &&
                (!Number.isInteger(semesterNumber) ||
                    semesterNumber < 1 ||
                    semesterNumber > 8)
            ) {
                reasons.push(
                    'Student semester must be an integer between 1 and 8'
                );
            }
            if (
                trimmedRoll &&
                duplicateRolls.has(trimmedRoll.toLowerCase())
            ) {
                reasons.push('Duplicate roll number / URN in uploaded file');
                isInFileDuplicate = true;
            }
            if (
                trimmedRoll &&
                registeredRolls.has(trimmedRoll.toLowerCase())
            ) {
                reasons.push('Roll number / URN already registered');
            }
        }

        if (
            (role === 'advisor' || role === 'hod') &&
            !effectiveDepartment
        ) {
            reasons.push(`${role} accounts require department`);
        }

        let parsedDateOfBirth = null;
        if (role && role !== 'student') {
            if (!row.dateOfBirth?.trim()) {
                reasons.push(
                    'Staff and admin accounts require dateOfBirth (YYYY-MM-DD)'
                );
            } else {
                parsedDateOfBirth = parseDateOfBirthInput(row.dateOfBirth);
                if (!parsedDateOfBirth) {
                    reasons.push('Invalid dateOfBirth — use YYYY-MM-DD');
                }
            }
        }

        let status = 'valid';
        if (isInFileDuplicate) {
            status = 'duplicate';
            duplicateCount += 1;
        } else if (reasons.length) {
            status = 'invalid';
            invalidCount += 1;
        } else {
            validCount += 1;
            validRecords.push({
                rowNumber: row.rowNumber,
                name: row.name.trim(),
                email: normalizedEmail,
                role,
                department: effectiveDepartment,
                rollNumber: trimmedRoll || undefined,
                semester: row.semester ? Number(row.semester) : undefined,
                section: row.section?.trim() || undefined,
                dateOfBirth: parsedDateOfBirth || undefined
            });
        }

        rows.push({
            rowNumber: row.rowNumber,
            status,
            reasons,
            record: row
        });
    }

    return {
        total: normalized.length,
        validCount,
        invalidCount,
        duplicateCount,
        rows,
        validRecords
    };
}

export async function createUsersFromValidRecords(validRecords) {
    const createdUsers = [];
    const failedUsers = [];
    const bulkAffectedDepartments = [];
    const importEmailGuard = new Set();

    for (const row of validRecords) {
        const rowNumber = row.rowNumber;
        try {
            if (importEmailGuard.has(row.email)) {
                failedUsers.push({
                    row: rowNumber,
                    email: row.email,
                    reason: 'Duplicate email in import batch'
                });
                continue;
            }
            importEmailGuard.add(row.email);

            const existingEmail = await userModel.findOne({
                email: row.email
            });
            if (existingEmail) {
                failedUsers.push({
                    row: rowNumber,
                    email: row.email,
                    reason: 'Email already registered'
                });
                continue;
            }

            if (row.role === 'student' && row.rollNumber) {
                const existingRoll = await userModel.findOne({
                    rollNumber: {
                        $regex: new RegExp(
                            `^${escapeRegExp(row.rollNumber)}$`,
                            'i'
                        )
                    }
                });
                if (existingRoll) {
                    failedUsers.push({
                        row: rowNumber,
                        email: row.email,
                        reason: 'Roll number / URN already registered'
                    });
                    continue;
                }
            }

            let temporaryPassword;
            try {
                temporaryPassword = buildInitialUserPassword({
                    role: row.role,
                    name: row.name.trim(),
                    rollNumber: row.rollNumber,
                    dateOfBirth: row.dateOfBirth
                });
            } catch (passwordError) {
                failedUsers.push({
                    row: rowNumber,
                    email: row.email,
                    reason:
                        passwordError.message ||
                        'Could not generate initial password'
                });
                continue;
            }

            const hashedPassword = await bcryptjs.hash(temporaryPassword, 10);

            const user = await userModel.create({
                name: row.name.trim(),
                email: row.email,
                password: hashedPassword,
                role: row.role,
                department: row.department || undefined,
                rollNumber: row.rollNumber || undefined,
                semester: row.semester ?? undefined,
                section: row.section || undefined,
                dateOfBirth: row.dateOfBirth || undefined,
                isFirstLogin: true,
                isActive: true
            });

            const loginIdentifier =
                user.role === 'student' ? user.rollNumber : user.email;

            createdUsers.push({
                id: user._id,
                name: user.name,
                loginIdentifier,
                email: user.email,
                role: user.role,
                rollNumber: user.rollNumber || undefined,
                temporaryPassword,
                row: rowNumber
            });

            const dept = (user.department || '').trim();
            if (dept && !bulkAffectedDepartments.includes(dept)) {
                bulkAffectedDepartments.push(dept);
            }
        } catch (err) {
            failedUsers.push({
                row: rowNumber,
                email: row.email || '',
                reason: err.message || 'Could not create user'
            });
        }
    }

    return { createdUsers, failedUsers, bulkAffectedDepartments };
}