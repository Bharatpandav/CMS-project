const STUDENT_URN_REGEX = /^\d{0,10}$/;

export function sanitizeUrnInput(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 10);
}

export function validateUrnForSubmit(value) {
    const urn = String(value || '').trim();
    if (!urn) {
        return { ok: false, message: 'URN is required' };
    }
    if (!/^\d{1,10}$/.test(urn)) {
        return {
            ok: false,
            message: 'URN must contain only digits (maximum 10 digits)'
        };
    }
    return { ok: true, urn };
}

export function isPartialUrnValid(value) {
    return STUDENT_URN_REGEX.test(String(value || ''));
}
