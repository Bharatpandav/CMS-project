/** Student URN / roll number for login (numeric, up to 10 digits). */
const STUDENT_URN_REGEX = /^\d{1,10}$/;

export function normalizeStudentUrn(value) {
    return String(value || '').trim();
}

export function validateStudentUrn(value) {
    const urn = normalizeStudentUrn(value);
    if (!urn) {
        return { ok: false, message: 'URN is required' };
    }
    if (!STUDENT_URN_REGEX.test(urn)) {
        return {
            ok: false,
            message:
                'URN must contain only digits (maximum 10 digits)'
        };
    }
    return { ok: true, urn };
}
