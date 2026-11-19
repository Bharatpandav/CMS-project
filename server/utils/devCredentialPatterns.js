/**
 * Initial login passwords and helpers (registration, bulk import, dev seeds).
 */

const STAFF_ROLES = ['advisor', 'hod', 'dean', 'super_admin'];

export function extractFirstName(fullName) {
    const trimmed = (fullName || '').trim();
    if (!trimmed) return '';
    return trimmed.split(/\s+/)[0];
}

/** Student: FirstName + last four digits of URN (numeric). */
export function buildStudentDevPassword(fullName, urn) {
    const first = extractFirstName(fullName);
    const digits = String(urn || '').replace(/\D/g, '');
    if (digits.length < 4) {
        throw new Error(`URN must contain at least 4 digits: ${urn}`);
    }
    const lastFour = digits.slice(-4);
    return `${first}${lastFour}`;
}

/** Staff: FirstName + four-digit birth year from date of birth. */
export function buildStaffDevPassword(fullName, dateOfBirth) {
    const first = extractFirstName(fullName);
    const date =
        dateOfBirth instanceof Date
            ? dateOfBirth
            : new Date(dateOfBirth);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Invalid date of birth for ${fullName}`);
    }
    return `${first}${date.getFullYear()}`;
}

export function parseDateOfBirthInput(value) {
    if (value == null || value === '') {
        return null;
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }
    const trimmed = String(value).trim();
    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]) - 1;
        const day = Number(isoMatch[3]);
        const d = new Date(year, month, day);
        if (
            !Number.isNaN(d.getTime()) &&
            d.getFullYear() === year &&
            d.getMonth() === month &&
            d.getDate() === day
        ) {
            return d;
        }
        return null;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
}

/**
 * Student: first name + last four digits of URN.
 * Staff / admins: first name + four-digit birth year.
 */
export function buildInitialUserPassword({
    role,
    name,
    rollNumber,
    dateOfBirth
}) {
    if (role === 'student') {
        return buildStudentDevPassword(name, rollNumber);
    }
    if (!STAFF_ROLES.includes(role)) {
        throw new Error(`Unsupported role: ${role}`);
    }
    const dob =
        dateOfBirth instanceof Date
            ? dateOfBirth
            : parseDateOfBirthInput(dateOfBirth);
    if (!dob) {
        throw new Error('Date of birth is required for staff and admin accounts');
    }
    return buildStaffDevPassword(name, dob);
}
