/**
 * Development-only predictable passwords for local/test seeding.
 * Not used by production registration APIs.
 */

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
