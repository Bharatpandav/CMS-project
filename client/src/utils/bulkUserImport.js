import { validateEmail } from './emailValidation.js';
import { rolesActorMayAssign } from './allowedRoles.js';

export const BULK_USER_HEADERS = [
    'name',
    'email',
    'role',
    'department',
    'rollNumber',
    'semester',
    'section'
];

export const MAX_BULK_FILE_BYTES = 2 * 1024 * 1024;
export const PREVIEW_ROW_LIMIT = 12;

const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx', '.xls'];

export function getBulkFileFormat(file) {
    if (!file) return '';
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) return 'CSV';
    if (name.endsWith('.xlsx')) return 'XLSX';
    if (name.endsWith('.xls')) return 'XLS';
    return '';
}

export function isAcceptedBulkFile(file) {
    if (!file) return false;
    const name = file.name.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function normalizeRow(raw) {
    const row = {};
    for (const key of BULK_USER_HEADERS) {
        const val = raw[key] ?? raw[key.toUpperCase()] ?? '';
        row[key] = val == null ? '' : String(val).trim();
    }
    return row;
}

export async function parseBulkUploadFile(file) {
    const format = getBulkFileFormat(file);
    if (!format) {
        throw new Error('Unsupported file type. Use .csv, .xlsx, or .xls');
    }
    if (file.size > MAX_BULK_FILE_BYTES) {
        throw new Error('File is too large. Maximum size is 2 MB.');
    }

    const XLSX = await import('xlsx');
    let workbook;
    if (format === 'CSV') {
        const text = await file.text();
        workbook = XLSX.read(text, { type: 'string', cellDates: true });
    } else {
        const buffer = await file.arrayBuffer();
        workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    }
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('Workbook contains no sheets');
    }
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, {
        defval: '',
        raw: false
    });
    if (!json.length) {
        throw new Error('Spreadsheet contains no data rows');
    }
    const headers = Object.keys(json[0] || {});
    const missing = BULK_USER_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length) {
        const err = new Error('Missing required columns');
        err.missingHeaders = missing;
        throw err;
    }
    return json.map(normalizeRow);
}

export function validateBulkUserRows(rows, actorRole, hodDepartment = '') {
    const creatable = rolesActorMayAssign(actorRole);
    const isHod = actorRole === 'hod';
    const errorsByRow = new Map();
    const emailRows = new Map();
    const rollRows = new Map();

    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const email = row.email?.toLowerCase();
        if (email) {
            if (!emailRows.has(email)) emailRows.set(email, []);
            emailRows.get(email).push(rowNumber);
        }
        if (row.role === 'student' && row.rollNumber) {
            const roll = row.rollNumber.toLowerCase();
            if (!rollRows.has(roll)) rollRows.set(roll, []);
            rollRows.get(roll).push(rowNumber);
        }
    });

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

    let validCount = 0;

    rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const reasons = [];

        if (!row.name || !row.email || !row.role) {
            reasons.push('Name, email and role are required');
        }

        const emailCheck = validateEmail(row.email);
        if (!emailCheck.ok && row.email) {
            reasons.push(emailCheck.message);
        } else if (emailCheck.ok && duplicateEmails.has(emailCheck.email)) {
            reasons.push('Duplicate email in file');
        }

        const role = row.role?.trim();
        if (role && !['student', 'advisor', 'hod', 'dean', 'super_admin'].includes(role)) {
            reasons.push('Invalid role');
        } else if (role && !creatable.includes(role)) {
            reasons.push(`Not authorized to create ${role} accounts`);
        }

        const dept =
            isHod && hodDepartment ? hodDepartment : row.department?.trim();

        if (role === 'student') {
            if (!dept || !row.rollNumber || !row.semester || !row.section) {
                reasons.push(
                    isHod
                        ? 'Students require rollNumber, semester and section'
                        : 'Students require department, rollNumber, semester and section'
                );
            }
            const sem = Number(row.semester);
            if (row.semester && (!Number.isInteger(sem) || sem < 1 || sem > 8)) {
                reasons.push('Semester must be 1–8');
            }
            if (
                row.rollNumber &&
                duplicateRolls.has(row.rollNumber.toLowerCase())
            ) {
                reasons.push('Duplicate roll number in file');
            }
        }

        if ((role === 'advisor' || role === 'hod') && !dept) {
            reasons.push(`${role} accounts require department`);
        }

        if (isHod && role && !['student', 'advisor'].includes(role)) {
            reasons.push('HOD may only import Student or Advisor rows');
        }

        if (reasons.length) {
            errorsByRow.set(rowNumber, reasons);
        } else {
            validCount += 1;
        }
    });

    return {
        total: rows.length,
        validCount,
        invalidCount: rows.length - validCount,
        errorsByRow
    };
}

export async function bulkFileToCsvBlob(file) {
    const format = getBulkFileFormat(file);
    if (format === 'CSV') return file;
    const rows = await parseBulkUploadFile(file);
    const header = BULK_USER_HEADERS.join(',');
    const body = rows
        .map((r) =>
            BULK_USER_HEADERS.map((h) => csvEscape(r[h] ?? '')).join(',')
        )
        .join('\n');
    const csv = `${header}\n${body}`;
    return new File([csv], 'bulk-import.csv', { type: 'text/csv' });
}

function csvEscape(value) {
    const s = String(value ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
}

export function downloadBulkTemplate() {
    const sample = [
        BULK_USER_HEADERS.join(','),
        'Jane Student,jane@example.com,student,Computer Science and Engineering,URN24001,3,A',
        'Arun Advisor,arun@example.com,advisor,Computer Science and Engineering,,,'
    ].join('\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-user-template.csv';
    a.click();
    URL.revokeObjectURL(url);
}